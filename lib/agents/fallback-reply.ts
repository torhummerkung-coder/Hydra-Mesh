import { composeFallback, type ComposerContext } from '../fallback/composer';
// Synchronous, zero network/DB dependencies. Context is required for meaningful responses.
export function getFallbackReply(context: ComposerContext = { message: '' }): string {
  return composeFallback(context);
}
