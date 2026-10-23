"""One private service / organization per Chroma directory. No cloud demo corpus."""
import os
import uuid
from functools import lru_cache
from pathlib import Path
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

@lru_cache(maxsize=1)
def store():
    key = os.getenv('EMBEDDING_API_KEY') or os.getenv('OPENAI_API_KEY')
    model = os.getenv('EMBEDDING_MODEL')
    if not key or not model:
        raise ValueError('Configure EMBEDDING_API_KEY and EMBEDDING_MODEL for knowledge search.')
    embeddings = OpenAIEmbeddings(api_key=key, model=model, max_retries=0)
    return Chroma(collection_name='smarttriage_runbooks', embedding_function=embeddings,
                  persist_directory=os.getenv('CHROMA_DIRECTORY', './data/chroma'))

def add_document(name: str, text: str):
    document_id = str(uuid.uuid4())
    chunks = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150).split_text(text)
    if not chunks or len(chunks) > 250:
        raise ValueError('Upload a nonempty document with at most 250 chunks.')
    docs = [Document(page_content=chunk, metadata={'document_id': document_id, 'source': Path(name).name[:150], 'chunk': i + 1}) for i, chunk in enumerate(chunks)]
    ids = [f'{document_id}:{i}' for i in range(len(docs))]
    # Remove partial vectors on failure; never silently skip chunks.
    try:
        store().add_documents(docs, ids=ids)
    except Exception:
        store().delete(ids=ids)
        raise
    return {'id': document_id, 'name': Path(name).name[:150], 'chunks': len(chunks)}

def documents():
    rows = store().get(include=['metadatas'])
    found = {}
    for metadata in rows['metadatas'] or []:
        item = found.setdefault(metadata['document_id'], {'id': metadata['document_id'], 'name': metadata['source'], 'chunks': 0})
        item['chunks'] += 1
    return list(found.values())

def remove_document(document_id: str):
    rows = store().get(where={'document_id': document_id}, include=[])
    if rows['ids']:
        store().delete(ids=rows['ids'])
    return len(rows['ids'])

def retrieve(log: str):
    if not store().get(limit=1)['ids']:
        return []
    docs = store().similarity_search(log[:12000], k=4)
    return [{'id': doc.metadata['document_id'], 'source': doc.metadata['source'], 'chunk': doc.metadata['chunk'], 'text': doc.page_content} for doc in docs]
