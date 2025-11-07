import requests
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import csv


class SerperSearchDataset:

    
    def __init__(self, api_key: Optional[str] = None):
    
        self.api_key = api_key or os.getenv('SERPER_API_KEY', '7c970d954c5a222e268bba4add34b02c4a72bbbb')
        self.url = "https://google.serper.dev/search"
        self.headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def search(self, query: str, num_results: int = 10) -> Dict:
    
        payload = json.dumps({
            "q": query,
            "num": num_results
        })
        
        response = requests.request("POST", self.url, headers=self.headers, data=payload)
        response.raise_for_status()
        return response.json()
    
    def save_dataset(self, query: str, results: Dict, output_dir: str = "datasets", 
                     format: str = "json") -> str:
    
    
        os.makedirs(output_dir, exist_ok=True)
        
        safe_query = "".join(c for c in query if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_query = safe_query.replace(' ', '_')[:50]
        
        if format.lower() == "json":
            filename = f"{safe_query}.json"
            filepath = os.path.join(output_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        
        elif format.lower() == "csv":
            filename = f"{safe_query}.csv"
            filepath = os.path.join(output_dir, filename)

            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=results[0].keys())
                writer.writeheader()
                writer.writerows(results)
        
        else:
            raise ValueError(f"Unsupported format: {format}. Use 'json' or 'csv'")
        
        return filepath
    
    def search_and_save(self, query: str, num_results: int = 10, 
                       output_dir: str = "datasets", format: str = "json") -> Dict:
    
        print(f"Searching for: {query}")
        results = self.search(query, num_results)
        
        filepath = self.save_dataset(query, results, output_dir, format)
        print(f"Dataset saved to: {filepath}")
        
        return {
            "query": query,
            "results": results,
            "saved_to": filepath
        }
    
    def load_dataset(self, filepath: str) -> Dict:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)


def search_and_save(query: str, api_key: Optional[str] = None, 
                   num_results: int = 10, output_dir: str = "datasets",
                   format: str = "json") -> Dict:

    searcher = SerperSearchDataset(api_key=api_key)
    return searcher.search_and_save(query, num_results, output_dir, format)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python search.py 'your search query' [num_results] [format]")
        print("Example: python search.py 'list of rice suppliers' 10 json")
        sys.exit(1)
    
    query = sys.argv[1]
    num_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    format_type = sys.argv[3] if len(sys.argv) > 3 else "json"
    
    try:
        searcher = SerperSearchDataset()
        result = searcher.search_and_save(query, num_results, format=format_type)
        
    
        print(f"\n{'='*80}")
        print(f"Search Query: {query}")
        print(f"Total Results: {len(result['results'].get('organic', []))}")
        print(f"Saved to: {result['saved_to']}")
        print(f"{'='*80}\n")
        
        organic = result['results'].get('organic', [])
        if organic:
            print("First 3 Results:")
            print("-" * 80)
            for i, item in enumerate(organic[:3], 1):
                print(f"{i}. {item.get('title', 'N/A')}")
                print(f"   {item.get('link', 'N/A')}")
                print(f"   {item.get('snippet', 'N/A')[:100]}...")
                print()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


