# import faiss
# import numpy as np
# import json
# import sys
# import os

# # Create a directory to store the vectors and texts as files if it doesn't exist
# os.makedirs("faiss_data", exist_ok=True)

# # Initialize FAISS index (128 dimensions)
# dimension = 128
# index = faiss.IndexFlatL2(dimension)


# def read_vector_from_file(file_path):
#     with open(file_path, 'r', encoding='utf-8') as f:
#         vector_str = f.read().strip()
#         return vector_str

# def read_text_from_file(file_path):
#     with open(file_path, 'r', encoding='utf-8') as f:
#         return f.read().strip()
# # Load existing data if available
# def load_data():
#     global index
#     try:
#         if os.path.exists("faiss_data/vectors.npy") and os.path.exists("faiss_data/texts.json"):
#             vectors = np.load("faiss_data/vectors.npy")
#             if vectors.shape[0] > 0:  # Only add if there are vectors
#                 index.add(vectors)
            
#             with open("faiss_data/texts.json", "r") as f:
#                 return json.load(f)
#     except Exception as e:
#         print(f"Error loading data: {e}", file=sys.stderr)
#     return {}

# # Save data to files
# def save_data(text_store, vectors):
#     try:
#         np.save("faiss_data/vectors.npy", vectors)
#         with open("faiss_data/texts.json", "w") as f:
#             json.dump(text_store, f)
#     except Exception as e:
#         print(f"Error saving data: {e}", file=sys.stderr)

# # In-memory storage for mapping IDs to text
# text_store = load_data()

# # Keep track of vectors for saving
# all_vectors = np.empty((0, dimension), dtype=np.float32)
# if index.ntotal > 0:
#     # This is a simplification - in a real implementation,
#     # you would need to retrieve the vectors from the index
#     all_vectors = np.zeros((index.ntotal, dimension), dtype=np.float32)

# def add_to_faiss(text, vector_str):
#     """Add text and its vector representation to FAISS index"""
#     global index, all_vectors, text_store
    
#     try:
#         # Clean the vector string and parse it
#         vector_str = vector_str.strip().replace("'", '"')
#         vector = np.array(json.loads(vector_str), dtype=np.float32).reshape(1, -1)
        
#         # Add to index
#         index.add(vector)
        
#         # Add to our vector storage
#         all_vectors = np.vstack([all_vectors, vector])
        
#         # Store the text
#         text_id = str(len(text_store))
#         text_store[text_id] = text
        
#         # Save the updated data
#         save_data(text_store, all_vectors)
        
#         return text_id
#     except Exception as e:
#         print(f"Error in add_to_faiss: {e}", file=sys.stderr)
#         return None

# def search_faiss(vector_str, top_k=3):
#     """Search for most similar texts based on vector similarity"""
#     global index, text_store
    
#     try:
#         # Clean the vector string and parse it
#         vector_str = vector_str.strip().replace("'", '"')
#         vector = np.array(json.loads(vector_str), dtype=np.float32).reshape(1, -1)
        
#         # Search the index
#         if index.ntotal == 0:
#             return []
            
#         distances, indices = index.search(vector, min(top_k, index.ntotal))
        
#         # Get the texts
#         results = []
#         for i, idx in enumerate(indices[0]):
#             # Only include results where distance is below a threshold
#             # Lower distance means higher similarity in FAISS
#             if distances[0][i] < 1.5:  # Adjust this threshold based on testing
#                 if str(idx) in text_store:
#                     results.append(text_store[str(idx)])
        
#         return results
#     except Exception as e:
#         print(f"Error in search_faiss: {e}", file=sys.stderr)
#         return []

# def get_relevant_context(vector_str, question, top_k=3):
#     """Get relevant context based on query vector and question"""
#     try:
#         results = search_faiss(vector_str, top_k)
#         if results:
#             return "Based on previous conversations, here's relevant information:\n" + "\n---\n".join(results)
#         return ""
#     except Exception as e:
#         print(f"Error in get_relevant_context: {e}", file=sys.stderr)
#         return ""

# if __name__ == "__main__":
#     try:
#         if len(sys.argv) < 2:
#             print("Usage: python faiss_store.py [add|search|context] [args...]", file=sys.stderr)
#             sys.exit(1)
            
#         command = sys.argv[1]
        
#         if command == "add" and len(sys.argv) >= 4:
#             text_file = sys.argv[2]
#             vector_file = sys.argv[3]
#             text = read_text_from_file(text_file)
#             vector_str = read_vector_from_file(vector_file)
#             add_to_faiss(text, vector_str)
#             print("Added text to FAISS index")
            
#         elif command == "search" and len(sys.argv) >= 3:
#             vector_file = sys.argv[2]
#             vector_str = read_vector_from_file(vector_file)
#             results = search_faiss(vector_str)
#             print(json.dumps(results))
            
#         elif command == "context" and len(sys.argv) >= 4:
#             vector_file = sys.argv[2]
#             question_file = sys.argv[3]
#             vector_str = read_vector_from_file(vector_file)
#             question = read_text_from_file(question_file)
#             context = get_relevant_context(vector_str, question)
#             print(context)
            
#         else:
#             print(f"Unknown command or missing arguments: {command}", file=sys.stderr)
#             sys.exit(1)
            
        
#     except Exception as e:
#         print(f"Unexpected error: {e}", file=sys.stderr)
#         sys.exit(1)

import faiss
import numpy as np
import json
import sys
import os

# Create a directory to store the vectors and texts as files if it doesn't exist
os.makedirs("faiss_data", exist_ok=True)

# Initialize FAISS index (128 dimensions)
dimension = 128
index = faiss.IndexFlatL2(dimension)

def read_vector_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        vector_str = f.read().strip()
        return vector_str

def read_text_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read().strip()

# Load existing data if available
def load_data():
    global index
    try:
        if os.path.exists("faiss_data/vectors.npy") and os.path.exists("faiss_data/texts.json"):
            vectors = np.load("faiss_data/vectors.npy")
            if vectors.shape[0] > 0:  # Only add if there are vectors
                index.add(vectors)
            
            with open("faiss_data/texts.json", "r", encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading data: {e}", file=sys.stderr)
    return {}

# Save data to files
def save_data(text_store, vectors):
    try:
        np.save("faiss_data/vectors.npy", vectors)
        with open("faiss_data/texts.json", "w", encoding='utf-8') as f:
            json.dump(text_store, f, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving data: {e}", file=sys.stderr)

# In-memory storage for mapping IDs to text
text_store = load_data()

# Keep track of vectors for saving
all_vectors = np.empty((0, dimension), dtype=np.float32)
if index.ntotal > 0:
    # This is a simplification - in a real implementation,
    # you would need to retrieve the vectors from the index
    all_vectors = np.zeros((index.ntotal, dimension), dtype=np.float32)

def add_to_faiss(text, vector_str):
    """Add text and its vector representation to FAISS index"""
    global index, all_vectors, text_store
    
    try:
        # Clean the vector string and parse it
        vector_str = vector_str.strip().replace("'", '"')
        vector = np.array(json.loads(vector_str), dtype=np.float32).reshape(1, -1)
        
        # Add to index
        index.add(vector)
        
        # Add to our vector storage
        all_vectors = np.vstack([all_vectors, vector])
        
        # Store the text
        text_id = str(len(text_store))
        text_store[text_id] = text
        
        # Save the updated data
        save_data(text_store, all_vectors)
        
        return text_id
    except Exception as e:
        print(f"Error in add_to_faiss: {e}", file=sys.stderr)
        return None

def search_faiss(vector_str, top_k=3):
    """Search for most similar texts based on vector similarity"""
    global index, text_store
    
    try:
        # Clean the vector string and parse it
        vector_str = vector_str.strip().replace("'", '"')
        vector = np.array(json.loads(vector_str), dtype=np.float32).reshape(1, -1)
        
        # Search the index
        if index.ntotal == 0:
            return []
            
        distances, indices = index.search(vector, min(top_k, index.ntotal))
        
        # Get the texts with a similarity threshold
        # Lower distance means higher similarity in FAISS (L2 distance)
        max_distance_threshold = 0.8  # Adjust based on testing
        
        results = []
        for i, idx in enumerate(indices[0]):
            if distances[0][i] < max_distance_threshold:  # Only include results below threshold
                if str(idx) in text_store:
                    results.append(text_store[str(idx)])
        
        return results
    except Exception as e:
        print(f"Error in search_faiss: {e}", file=sys.stderr)
        return []

def get_relevant_context(vector_str, question, top_k=3):
    """Get relevant context based on query vector and question"""
    try:
        # Skip short questions (likely greetings)
        if len(question.strip().split()) < 3:
            return ""
            
        results = search_faiss(vector_str, top_k)
        if results:
            return "Based on previous conversations, here's relevant information:\n" + "\n---\n".join(results)
        return ""
    except Exception as e:
        print(f"Error in get_relevant_context: {e}", file=sys.stderr)
        return ""

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("Usage: python faiss_store.py [add|search|context] [args...]", file=sys.stderr)
            sys.exit(1)
            
        command = sys.argv[1]
        
        if command == "add" and len(sys.argv) >= 4:
            text_file = sys.argv[2]
            vector_file = sys.argv[3]
            text = read_text_from_file(text_file)
            vector_str = read_vector_from_file(vector_file)
            add_to_faiss(text, vector_str)
            print("Added text to FAISS index")
            
        elif command == "search" and len(sys.argv) >= 3:
            vector_file = sys.argv[2]
            vector_str = read_vector_from_file(vector_file)
            results = search_faiss(vector_str)
            print(json.dumps(results))
            
        elif command == "context" and len(sys.argv) >= 4:
            vector_file = sys.argv[2]
            question_file = sys.argv[3]
            vector_str = read_vector_from_file(vector_file)
            question = read_text_from_file(question_file)
            context = get_relevant_context(vector_str, question)
            print(context)
            
        else:
            print(f"Unknown command or missing arguments: {command}", file=sys.stderr)
            sys.exit(1)
            
        
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)