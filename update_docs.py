import os
import glob
import re

MD_FILES = glob.glob("d:/SupplyMindAI/*.md") + glob.glob("d:/SupplyMindAI/docs/**/*.md", recursive=True) + glob.glob("d:/SupplyMindAI/architecture/**/*.md", recursive=True)

RAG_PIPELINE_FLOW = """### Inventory Intelligence Engine Flow
1. **CSV Upload**: Raw data ingestion.
2. **Cleaning & Feature Engineering**: ML preprocessing.
3. **Forecast**: Demand prediction generation.
4. **Inventory Optimization**: Computing safety stock, EOQ, ROP.
5. **Inventory Snapshot**: Latest operational state.
6. **Knowledge Builder**: Generation of semantic inventory documents (Raw DB rows are NOT embedded).
7. **Embeddings & Vector Store**: Storage of specialized inventory knowledge.
8. **Intent Detection**: Routing user queries to the proper agent.
9. **Inventory Agent**: Evaluates Business Rules before retrieving.
10. **Retriever**: Top-K retrieval with metadata filtering.
11. **LLM Reasoning**: Producing Final Answer with Summary, Reasoning, Evidence, Recommendation, and Confidence.
"""

for filepath in MD_FILES:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if we need to modify
        if "RAG" in content or "Retrieval-Augmented Generation" in content:
            # Replace RAG with Inventory Intelligence Engine in general context, but keeping specific variable names intact
            content = re.sub(r'\bRAG Agent\b', 'Inventory Intelligence Agent', content)
            content = re.sub(r'\bRAG System\b', 'Inventory Intelligence Engine', content)
            content = re.sub(r'\bRAG pipeline\b', 'Inventory Intelligence Engine pipeline', content)
            content = re.sub(r'\bRAG architecture\b', 'Inventory Intelligence Engine architecture', content, flags=re.IGNORECASE)
            
            # For README and main architecture docs, we append the flow if it's related
            if "README.md" in filepath or "ARCHITECTURE.md" in filepath:
                if "Inventory Intelligence Engine Flow" not in content:
                    content += "\n\n" + RAG_PIPELINE_FLOW

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

# Rename RAG_ARCHITECTURE.md to KNOWLEDGE.md
old_rag_doc = "d:/SupplyMindAI/RAG_ARCHITECTURE.md"
new_rag_doc = "d:/SupplyMindAI/KNOWLEDGE.md"
if os.path.exists(old_rag_doc):
    os.rename(old_rag_doc, new_rag_doc)
    print(f"Renamed {old_rag_doc} to {new_rag_doc}")
