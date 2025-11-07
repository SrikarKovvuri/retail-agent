import os
import json
import boto3
from typing import Dict, Optional, List
from botocore.exceptions import ClientError


class BedrockAgent:
    """
    AWS Bedrock agent for generating responses from text input.
    Supports various Bedrock models including Claude, Llama, and others.
    """
    
    def __init__(
        self,
        region_name: Optional[str] = us-east-1,
        aws_access_key_id: Optional[str] = AWS_ACCESS_KEY_ID,
        aws_secret_access_key: Optional[str] = AWS_SECRET_ACCESS_KEY,
        model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    ):
        """
        Initialize the Bedrock agent.
        
        Args:
            region_name: AWS region (defaults to AWS_REGION env var or 'us-east-1')
            aws_access_key_id: AWS access key (defaults to AWS_ACCESS_KEY_ID env var)
            aws_secret_access_key: AWS secret key (defaults to AWS_SECRET_ACCESS_KEY env var)
            model_id: Bedrock model ID to use. Common options:
                - anthropic.claude-3-sonnet-20240229-v1:0 (Claude 3 Sonnet)
                - anthropic.claude-3-haiku-20240307-v1:0 (Claude 3 Haiku)
                - anthropic.claude-3-opus-20240229-v1:0 (Claude 3 Opus)
                - meta.llama3-8b-instruct-v1:0 (Llama 3 8B)
                - meta.llama3-70b-instruct-v1:0 (Llama 3 70B)
        """
        self.region_name = region_name or os.getenv('AWS_REGION', 'us-east-1')
        self.model_id = model_id
        
        # Initialize boto3 client
        try:
            self.bedrock_runtime = boto3.client(
                'bedrock-runtime',
                region_name=self.region_name,
                aws_access_key_id=aws_access_key_id or os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=aws_secret_access_key or os.getenv('AWS_SECRET_ACCESS_KEY')
            )
        except Exception as e:
            raise ValueError(f"Failed to initialize Bedrock client: {e}. "
                           f"Make sure AWS credentials are configured.")
    
    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        top_p: float = 0.9,
        stop_sequences: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a response from Bedrock model.
        
        Args:
            prompt: The input text/prompt to send to the model
            system_prompt: Optional system prompt for Claude models
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Top-p sampling parameter
            stop_sequences: List of stop sequences
            
        Returns:
            Dictionary containing:
                - response: The generated text response
                - usage: Token usage information
                - model: Model ID used
        """
        # Determine model provider and format request accordingly
        if self.model_id.startswith('anthropic.claude'):
            return self._invoke_claude(
                prompt, system_prompt, max_tokens, temperature, top_p, stop_sequences
            )
        elif self.model_id.startswith('meta.llama'):
            return self._invoke_llama(
                prompt, max_tokens, temperature, top_p, stop_sequences
            )
        else:
            # Try Claude format as default
            return self._invoke_claude(
                prompt, system_prompt, max_tokens, temperature, top_p, stop_sequences
            )
    
    def _invoke_claude(
        self,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[List[str]]
    ) -> Dict:
        """Invoke Claude model via Bedrock."""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        if system_prompt:
            body["system"] = system_prompt
        
        if stop_sequences:
            body["stop_sequences"] = stop_sequences
        
        try:
            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body)
            )
            
            response_body = json.loads(response['body'].read())
            
            return {
                "response": response_body['content'][0]['text'],
                "usage": {
                    "input_tokens": response_body.get('usage', {}).get('input_tokens', 0),
                    "output_tokens": response_body.get('usage', {}).get('output_tokens', 0)
                },
                "model": self.model_id
            }
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            raise Exception(f"Bedrock API error ({error_code}): {error_message}")
    
    def _invoke_llama(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[List[str]]
    ) -> Dict:
        """Invoke Llama model via Bedrock."""
        body = {
            "prompt": prompt,
            "max_gen_len": max_tokens,
            "temperature": temperature,
            "top_p": top_p
        }
        
        if stop_sequences:
            body["stop"] = stop_sequences
        
        try:
            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body)
            )
            
            response_body = json.loads(response['body'].read())
            
            return {
                "response": response_body['generation'],
                "usage": {
                    "input_tokens": response_body.get('prompt_token_count', 0),
                    "output_tokens": response_body.get('generation_token_count', 0)
                },
                "model": self.model_id
            }
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            raise Exception(f"Bedrock API error ({error_code}): {error_message}")
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Dict:
        """
        Chat with the model using a conversation history.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
                     Roles can be 'user' or 'assistant'
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Dictionary with response and usage info
        """
        if self.model_id.startswith('anthropic.claude'):
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages
            }
            
            if system_prompt:
                body["system"] = system_prompt
            
            try:
                response = self.bedrock_runtime.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body)
                )
                
                response_body = json.loads(response['body'].read())
                
                return {
                    "response": response_body['content'][0]['text'],
                    "usage": {
                        "input_tokens": response_body.get('usage', {}).get('input_tokens', 0),
                        "output_tokens": response_body.get('usage', {}).get('output_tokens', 0)
                    },
                    "model": self.model_id
                }
            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_message = e.response['Error']['Message']
                raise Exception(f"Bedrock API error ({error_code}): {error_message}")
        else:
            # For non-Claude models, use the last user message
            last_user_message = next(
                (msg for msg in reversed(messages) if msg['role'] == 'user'),
                None
            )
            if not last_user_message:
                raise ValueError("No user message found in conversation history")
            
            return self.generate_response(
                last_user_message['content'],
                system_prompt,
                max_tokens,
                temperature
            )


# Convenience function for quick usage
def generate_bedrock_response(
    prompt: str,
    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0",
    system_prompt: Optional[str] = None,
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> str:
    """
    Quick function to generate a response from Bedrock.
    
    Args:
        prompt: Input text/prompt
        model_id: Bedrock model ID
        system_prompt: Optional system prompt
        max_tokens: Maximum tokens
        temperature: Sampling temperature
        
    Returns:
        Generated response text
    """
    agent = BedrockAgent(model_id=model_id)
    result = agent.generate_response(
        prompt=prompt,
        system_prompt=system_prompt,
        max_tokens=max_tokens,
        temperature=temperature
    )
    return result["response"]


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python agent.py 'your prompt here'")
        print("Example: python agent.py 'What is machine learning?'")
        sys.exit(1)
    
    prompt = sys.argv[1]
    
    try:
        agent = BedrockAgent()
        result = agent.generate_response(prompt)
        
        print(f"\n{'='*80}")
        print(f"Prompt: {prompt}")
        print(f"{'='*80}")
        print(f"\nResponse:\n{result['response']}")
        print(f"\n{'='*80}")
        print(f"Model: {result['model']}")
        print(f"Input tokens: {result['usage']['input_tokens']}")
        print(f"Output tokens: {result['usage']['output_tokens']}")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
