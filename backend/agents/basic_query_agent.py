from .provider_config import get_llm_provider, get_gemini_model, get_gemini_api_key
from .gemini_client import generate as gemini_generate

DEFAULT_PROMPT = (
    "You are a helpful assistant for the Hasamex Expert Database application. "
    "Answer questions clearly and concisely about app features, data fields, and workflows. "
    "Use bullet points for clarity when listing steps or items. "
    "If a question is unrelated to the app or you lack context, ask for clarification."
)

class BasicQueryAgent:
    def __init__(self, system_prompt=DEFAULT_PROMPT):
        self.system_prompt = system_prompt
        self.provider = get_llm_provider()
        self.gemini_model = get_gemini_model()
        self.gemini_api_key = get_gemini_api_key()

    def answer(self, question, context=None):
        if not isinstance(question, str) or not question.strip():
            return ""
        content = question.strip()
        if context and isinstance(context, str) and context.strip():
            content = f"{content}\n\nContext:\n{context.strip()}"
        if self.provider == "gemini":
            return gemini_generate(self.gemini_api_key, self.gemini_model, self.system_prompt, content) or ""
        return ""
