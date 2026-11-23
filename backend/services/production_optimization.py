from decimal import Decimal
from math import isfinite
from time import monotonic

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_array

from backend.schemas.materials import (
    MaterialSupplierQuote, OptimizedBuild, OptimizedOrder, OptimizedScenario,
    OptimizedTarget, ProductionOptimizationRequest, ProjectedMaterialBalance,
)


def optimize_production(
    request: ProductionOptimizationRequest,
    daily_minutes: int,
    recipes: dict[str, dict[str, int]],
    stock: dict[str, int],
    quotes: dict[str, MaterialSupplierQuote],
) -> OptimizedScenario:
    horizon = max(target.due_day for target in request.targets)
    days = range(1, horizon + 1)
    upper = []

    def variable(limit):
        upper.append(limit)
        return len(upper) - 1

    build = {
        (target.product_id, day): variable(min(target.units, daily_minutes // target.minutes_per_unit))
        for target in request.targets for day in range(1, target.due_day + 1)
    }
    missed = {
        target.product_id: variable(0 if request.strict_targets else target.units)
        for target in request.targets
    }
    material_need = {
        material: sum(recipes[t.product_id].get(material, 0) * t.units for t in request.targets)
        for material in stock
    }
    buy = {
        (material, day): variable(material_need[material] - stock[material])
        for material, quote in quotes.items() if material_need[material] > stock[material]
        for day in range(1, horizon - quote.lead_time_days + 1)
    }
    balance = {
        (material, day): variable(max(opening, material_need[material]))
        for material, opening in stock.items() for day in days
    }

    row_ids, columns, values, lower_rows, upper_rows = [], [], [], [], []

    def add_row(coefficients, lower, ceiling):
        for column, value in coefficients:
            row_ids.append(len(lower_rows))
            columns.append(column)
            values.append(value)
        lower_rows.append(lower)
        upper_rows.append(ceiling)

    for target in request.targets:
        coefficients = [
            (build[target.product_id, day], 1) for day in range(1, target.due_day + 1)
        ]
        add_row([*coefficients, (missed[target.product_id], 1)], target.units, target.units)

    for day in days:
        add_row(
            [(build[t.product_id, day], t.minutes_per_unit) for t in request.targets if day <= t.due_day],
            0, daily_minutes,
        )
        for material, opening in stock.items():
            coefficients = [(balance[material, day], 1)]
            if day > 1:
                coefficients.append((balance[material, day - 1], -1))
            quote = quotes.get(material)
            order = buy.get((material, day - quote.lead_time_days)) if quote else None
            if order is not None:
                coefficients.append((order, -1))
            coefficients.extend(
                (build[t.product_id, day], recipes[t.product_id][material])
                for t in request.targets if day <= t.due_day and material in recipes[t.product_id]
            )
            initial = opening if day == 1 else 0
            add_row(coefficients, initial, initial)

    prices = {material: int(quote.unit_price * 100) for material, quote in quotes.items()}
    service = np.zeros(len(upper))
    cost = np.zeros(len(upper))
    for target in request.targets:
        service[missed[target.product_id]] = target.priority
    for (material, _), index in buy.items():
        cost[index] = prices[material]
    if request.budget_egp is not None:
        add_row([(i, cost[i]) for i in buy.values() if cost[i]], 0, int(request.budget_egp * 100))

    deadline = monotonic() + 4

    def solve(objective):
        matrix = coo_array((values, (row_ids, columns)), shape=(len(lower_rows), len(upper))).tocsc()
        result = milp(
            objective, integrality=np.ones(len(upper)), bounds=Bounds(0, upper),
            constraints=LinearConstraint(matrix, lower_rows, upper_rows),
            options={"time_limit": max(0.001, deadline - monotonic()), "mip_rel_gap": 0.0},
        )
        if result.status not in (0, 1, 2):
            raise RuntimeError(f"Unexpected production solver status {result.status}")
        if result.x is None:
            return result, None
        candidate = np.rint(result.x).astype(np.int64)
        evaluated = matrix @ candidate
        if (np.any(np.abs(result.x - candidate) > 1e-5)
                or np.any(candidate < 0) or np.any(candidate > upper)
                or np.any(evaluated < lower_rows) or np.any(evaluated > upper_rows)):
            raise RuntimeError("Production solver returned an invalid integer plan")
        return result, candidate

    objective = "cost" if request.strict_targets else "service"
    result, plan = solve(cost if request.strict_targets else service)
    if plan is None:
        status = "infeasible" if result.status == 2 else "no_solution"
        return OptimizedScenario(status=status, daily_minutes=daily_minutes)

    cost_unproven = False
    if objective == "service" and result.status == 0 and np.any(cost):
        best_service = int(service @ plan)
        add_row([(i, service[i]) for i in missed.values()], best_service, best_service)
        cost_unproven = True
        objective = "cost"
        if monotonic() < deadline:
            cost_result, cost_plan = solve(cost)
            if cost_plan is not None and cost @ cost_plan <= cost @ plan:
                result, plan = cost_result, cost_plan
                cost_unproven = False

    optimal = result.status == 0 and not cost_unproven
    gap = getattr(result, "mip_gap", None) if not optimal and not cost_unproven else None
    if gap is not None and not isfinite(gap):
        gap = None
    return describe_plan(
        request, days, recipes, stock, quotes, plan, build, buy, missed,
        OptimizedScenario(
            status="optimal" if optimal else "feasible", daily_minutes=daily_minutes,
            gap=gap, gap_objective=objective if gap is not None else None,
            weighted_missed_units=int(service @ plan),
        ),
    )


def describe_plan(request, days, recipes, stock, quotes, plan, build, buy, missed, scenario):
    scenario.targets = [
        OptimizedTarget(product_id=t.product_id, due_day=t.due_day, units=t.units,
                        missed_units=int(plan[missed[t.product_id]]))
        for t in request.targets
    ]
    minutes = {t.product_id: t.minutes_per_unit for t in request.targets}
    scenario.builds = sorted(
        (OptimizedBuild(day=day, product_id=product, units=int(plan[index]),
                        line_minutes=int(plan[index]) * minutes[product])
         for (product, day), index in build.items() if plan[index]),
        key=lambda item: (item.day, item.product_id),
    )
    orders = {key: int(plan[index]) for key, index in buy.items() if plan[index]}
    # Remove surplus purchases from the last arrival backwards, including zero-price quotes.
    for material, opening in stock.items():
        consumption = sum(recipes[b.product_id].get(material, 0) * b.units for b in scenario.builds)
        order_days = sorted((day for m, day in orders if m == material), reverse=True)
        surplus = max(0, opening + sum(orders[material, d] for d in order_days) - consumption)
        for day in order_days:
            removed = min(surplus, orders[material, day])
            orders[material, day] -= removed
            surplus -= removed

    scenario.orders = [
        OptimizedOrder(material_id=material, supplier_name=quotes[material].supplier_name, order_day=day,
                       arrival_day=day + quotes[material].lead_time_days,
                       units=units, cost_egp=units * quotes[material].unit_price)
        for (material, day), units in sorted(orders.items(), key=lambda order: (order[0][1], order[0][0]))
        if units
    ]
    scenario.spend_egp = sum((order.cost_egp for order in scenario.orders), start=Decimal("0.00"))
    balances = stock.copy()
    for day in days:
        for order in scenario.orders:
            if order.arrival_day == day:
                balances[order.material_id] += order.units
        for item in scenario.builds:
            if item.day == day:
                for material, per_unit in recipes[item.product_id].items():
                    balances[material] -= item.units * per_unit
        scenario.balances.extend(
            ProjectedMaterialBalance(material_id=material, day=day, on_hand=quantity)
            for material, quantity in balances.items()
        )
    return scenario
