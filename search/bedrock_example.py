"""
Example usage of the BedrockAgent class.

Before running, make sure you have:
1. Installed dependencies: pip install -r requirements.txt
2. Configured AWS credentials (via environment variables or AWS CLI):
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION (optional, defaults to us-east-1)
3. Enabled the Bedrock model in your AWS account
"""

from agent import BedrockAgent, generate_bedrock_response


def example_basic_usage():
    """Basic example: Generate a simple response."""
    print("=" * 80)
    print("Example 1: Basic Usage")
    print("=" * 80)
    
    agent = BedrockAgent()
    
    prompt = "Explain what machine learning is in one paragraph."
    result = agent.generate_response(prompt)
    
    print(f"\nPrompt: {prompt}")
    print(f"\nResponse:\n{result['response']}")
    print(f"\nTokens used: {result['usage']}")


def example_with_system_prompt():
    """Example with a system prompt for Claude models."""
    print("\n" + "=" * 80)
    print("Example 2: With System Prompt")
    print("=" * 80)
    
    agent = BedrockAgent()
    
    system_prompt = "You are a helpful assistant that explains complex topics simply."
    prompt = "What is quantum computing?"
    
    result = agent.generate_response(
        prompt=prompt,
        system_prompt=system_prompt,
        max_tokens=500,
        temperature=0.5
    )
    
    print(f"\nSystem Prompt: {system_prompt}")
    print(f"\nUser Prompt: {prompt}")
    print(f"\nResponse:\n{result['response']}")


def example_chat_conversation():
    """Example of a multi-turn conversation."""
    print("\n" + "=" * 80)
    print("Example 3: Chat Conversation")
    print("=" * 80)
    
    agent = BedrockAgent()
    
    messages = [
        {"role": "user", "content": "What is Python?"},
    ]
    
    # First turn
    result1 = agent.chat(messages)
    print(f"\nUser: {messages[0]['content']}")
    print(f"Assistant: {result1['response']}")
    
    # Add assistant response and continue conversation
    messages.append({"role": "assistant", "content": result1['response']})
    messages.append({"role": "user", "content": "Can you give me a simple example?"})
    
    # Second turn
    result2 = agent.chat(messages)
    print(f"\nUser: {messages[-1]['content']}")
    print(f"Assistant: {result2['response']}")


def example_different_model():
    """Example using a different model (Llama)."""
    print("\n" + "=" * 80)
    print("Example 4: Using Different Model (Llama)")
    print("=" * 80)
    
    # Use Llama 3 8B model
    agent = BedrockAgent(model_id="meta.llama3-8b-instruct-v1:0")
    
    prompt = "Write a haiku about programming."
    result = agent.generate_response(prompt, max_tokens=200)
    
    print(f"\nPrompt: {prompt}")
    print(f"\nResponse:\n{result['response']}")
    print(f"\nModel used: {result['model']}")


def example_quick_function():
    """Example using the convenience function."""
    print("\n" + "=" * 80)
    print("Example 5: Quick Function")
    print("=" * 80)
    
    prompt = "What are the benefits of cloud computing?"
    response = generate_bedrock_response(prompt, max_tokens=300)
    
    print(f"\nPrompt: {prompt}")
    print(f"\nResponse:\n{response}")


if __name__ == "__main__":
    try:
        # Run examples
        example_basic_usage()
        example_with_system_prompt()
        example_chat_conversation()
        example_different_model()
        example_quick_function()
        
    except Exception as e:
        print(f"\nError: {e}")
        print("\nMake sure you have:")
        print("1. Installed dependencies: pip install -r requirements.txt")
        print("2. Configured AWS credentials")
        print("3. Enabled the Bedrock model in your AWS account")
        import traceback
        traceback.print_exc()

