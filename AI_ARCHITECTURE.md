# Supply Mind AI Architecture

This document describes the upgraded Agentic AI orchestration architecture for the Supply Mind platform, leveraging LangChain, LangGraph, and LangSmith.

## Core Orchestration (LangGraph)

The system relies on a **StateGraph** topology designed to route requests across specialized operational agents.

- **Supervisor Node:** Analyzes the user's current intent, context, and operational requirements. It conditionally routes to one of the following:
  - `Forecasting Agent`: Expert in interpreting ML predictions over multi-month horizons.
  - `Inventory Agent`: Expert in interpreting stock risks, reorder levels, and optimizations.
  - `MLOps Agent`: Expert in evaluating model accuracy and data drift statistics.
  - `RAG Knowledge Agent`: Expert in fetching historical data from the Chroma vector database.

- **Tools Node:** Specialized functions wrapped as `@tool`s.
  - `generate_forecast`: Interfaces directly with the XGBoost pipeline.
  - `analyze_inventory`: Triggers the optimization calculations.
  - `query_inventory_knowledge`: Interfaces with the semantic embedding database.
  - `get_mlops_metrics`: Retrieves pipeline health statistics.

## Interaction Flow
1. API receives a request with `product_id` and semantic query.
2. The initial state is seeded and passed to the LangGraph app.
3. The Supervisor parses the message and targets the best Agent node.
4. The Agent formulates a plan and calls a Tool.
5. Tool output is pushed back to the State, which cycles back to the Agent/Supervisor until a final reasoning response is established.
