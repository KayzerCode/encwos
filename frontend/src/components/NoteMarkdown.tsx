// comments only in English
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import './NoteMarkdown.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

type Props = { source: string };

// Allow className on <code> like "language-ts" and prism token classes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className', /^language-[a-z0-9-]+$/],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['className', /^token(\s.*)?$/],
    ],
  },
};

// Define components with proper typing; use a small cast to read `inline`
const components: Components = {
  code(props) {
    const { className, children } = props;
    const isInline = (props as any).inline as boolean | undefined;
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children ?? '').replace(/\n$/, '');

    if (!isInline && match) {
      return (
        <SyntaxHighlighter language={match[1]} PreTag="div">
          {codeText}
        </SyntaxHighlighter>
      );
    }
    return <code className={className}>{codeText}</code>;
  },
  a({ href, children, ...rest }) {
    return (
      <a href={href ?? undefined} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  },
};

export default function NoteMarkdown({ source }: Props) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {source || ''}
      </ReactMarkdown>
    </div>
  );
}
