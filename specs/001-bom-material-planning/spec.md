# Bill of materials and raw-material planning

## User stories

1. A planner selects a product and a one-, three-, or six-month horizon to see forecast demand, BOM quantities per product, and total raw materials required.
2. A planner compares each requirement with recorded raw stock and sees the amount to buy, the remaining balance, and the first month with an uncovered requirement.
3. An inventory manager records actual on-hand counts in Inventory. The next plan uses the saved counts, including confirmed zeros.

## Clarifications

- `data/bom.csv` supplies per-product material usage and `data/raw_materials.csv` supplies the material catalog. `data/inventory.csv` tracks finished products. The repository has no raw-stock counts.
- Inventory holds one shared on-hand balance per material. An unrecorded balance yields an unknown purchase quantity. A recorded zero is a valid balance.
- The plan uses the full forecast for the selected product, drawing from the opening raw-stock balance once. Stock held for other products, incoming orders, and finished goods are outside this calculation.
- Forecasting and BOM use the same upcoming calendar months and demand quantities. With a longer horizon, a lower monthly forecast reduces that month's consumption while cumulative consumption can still rise.

## Acceptance

- A forecast of 2,000 Fans requires 8,000 Plastic Housing, 8,000 Steel Body, and 2,000 Heating Element units from the repository BOM.
- With 7,000 Plastic Housing units in stock, the plan recommends buying 1,000. A recorded balance of 9,000 recommends buying zero and shows 1,000 remaining.
- A missing stock count never produces a purchase recommendation. Inventory managers can provide that count, and planners can return to the same forecast selection.
- Demand by month, coverage, shortages, and unknown stock are distinguishable on mobile and desktop in English and Arabic.
