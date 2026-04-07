import type { SupportedLanguages } from 'gitnexus-shared';
import type { SyntaxNode } from './utils/ast-helpers.js';

/**
 * Cross-language qualified type names are normalized to dot-separated scope
 * segments:
 * - file/package scope contributes leading segments when the language has one
 * - lexical namespace/module/type scope contributes enclosing segments
 * - the simple type name is always the trailing segment
 */
export interface ClassExtractor {
  language: SupportedLanguages;
  isTypeDeclaration(node: SyntaxNode): boolean;
  extractQualifiedName(node: SyntaxNode, simpleName: string): string | null;
}

export interface ClassExtractionConfig {
  language: SupportedLanguages;
  typeDeclarationNodes: string[];
  fileScopeNodeTypes?: string[];
  ancestorScopeNodeTypes?: string[];
  scopeNameNodeTypes?: string[];
  extractScopeSegments?: (node: SyntaxNode) => string[] | null | undefined;
}
