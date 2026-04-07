import type { SyntaxNode } from '../utils/ast-helpers.js';
import type { ClassExtractionConfig, ClassExtractor } from '../class-types.js';

const DEFAULT_SCOPE_NAME_NODE_TYPES = new Set([
  'nested_namespace_specifier',
  'scoped_identifier',
  'scoped_type_identifier',
  'qualified_name',
  'namespace_name',
  'namespace_identifier',
  'package_identifier',
  'type_identifier',
  'identifier',
  'name',
  'constant',
]);

const normalizeQualifiedName = (value: string): string =>
  value
    .replace(/\s+/g, '')
    .replace(/^::/, '')
    .replace(/::/g, '.')
    .replace(/\\/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');

const splitQualifiedName = (value: string): string[] => {
  const normalized = normalizeQualifiedName(value);
  return normalized ? normalized.split('.').filter(Boolean) : [];
};

const extractScopeSegmentsFromNode = (
  scopeNode: SyntaxNode,
  scopeNameNodeTypes: ReadonlySet<string>,
): string[] => {
  const nameNode =
    scopeNode.childForFieldName?.('name') ??
    scopeNode.namedChildren?.find((child) => scopeNameNodeTypes.has(child.type));
  return nameNode ? splitQualifiedName(nameNode.text) : [];
};

export function createClassExtractor(config: ClassExtractionConfig): ClassExtractor {
  const typeDeclarationSet = new Set(config.typeDeclarationNodes);
  const fileScopeSet = new Set(config.fileScopeNodeTypes ?? []);
  const ancestorScopeSet = new Set(config.ancestorScopeNodeTypes ?? []);
  const scopeNameNodeTypes = new Set([
    ...DEFAULT_SCOPE_NAME_NODE_TYPES,
    ...(config.scopeNameNodeTypes ?? []),
  ]);

  return {
    language: config.language,

    isTypeDeclaration(node: SyntaxNode): boolean {
      return typeDeclarationSet.has(node.type);
    },

    extractQualifiedName(node: SyntaxNode, simpleName: string): string | null {
      if (!typeDeclarationSet.has(node.type)) return null;

      let root = node;
      while (root.parent) root = root.parent;

      const readScopeSegments = (scopeNode: SyntaxNode): string[] =>
        config.extractScopeSegments?.(scopeNode) ??
        extractScopeSegmentsFromNode(scopeNode, scopeNameNodeTypes);

      const fileScopeSegments: string[] = [];
      for (const child of root.namedChildren ?? []) {
        if (fileScopeSet.has(child.type)) {
          fileScopeSegments.push(...readScopeSegments(child));
        }
      }

      const ancestorScopes: string[][] = [];
      let current = node.parent;
      while (current) {
        if (ancestorScopeSet.has(current.type)) {
          const segments = readScopeSegments(current);
          if (segments.length > 0) ancestorScopes.push(segments);
        }
        current = current.parent;
      }

      const qualifiedName = [
        ...fileScopeSegments,
        ...ancestorScopes.reverse().flat(),
        ...splitQualifiedName(simpleName),
      ]
        .filter(Boolean)
        .join('.');

      return qualifiedName || simpleName;
    },
  };
}
