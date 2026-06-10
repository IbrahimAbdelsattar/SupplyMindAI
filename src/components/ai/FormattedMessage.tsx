import React from 'react';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className }) => {
  if (!content) return null;

  // Function to parse inline formatting like bold, italic, and inline code
  const parseInlineElements = (text: string): React.ReactNode[] => {
    // Regex matching: **bold**, *italic*, `code`
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-muted-foreground/10 px-1 py-0.5 rounded font-mono text-xs text-foreground font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Split content into lines and process block-level elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let keyCounter = 0;

  const pushCurrentList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType;
      const listClassName = listType === 'ul' ? 'list-disc pl-5 my-2 space-y-1 text-sm' : 'list-decimal pl-5 my-2 space-y-1 text-sm';
      elements.push(
        <ListTag key={`list-${keyCounter++}`} className={listClassName}>
          {currentList}
        </ListTag>
      );
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 1. Headers (### Title)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      pushCurrentList();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const parsedText = parseInlineElements(text);

      if (level === 1) {
        elements.push(<h1 key={`h1-${keyCounter++}`} className="text-base font-bold mt-3 mb-1.5 text-foreground">{parsedText}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={`h2-${keyCounter++}`} className="text-sm font-bold mt-2 mb-1 text-foreground">{parsedText}</h2>);
      } else {
        elements.push(<h3 key={`h3-${keyCounter++}`} className="text-xs font-semibold mt-1.5 mb-0.5 text-foreground">{parsedText}</h3>);
      }
      continue;
    }

    // 2. Unordered lists (- Item or * Item)
    const ulMatch = line.match(/^([-*])\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        pushCurrentList();
        listType = 'ul';
      }
      const itemText = ulMatch[2];
      currentList.push(
        <li key={`li-${keyCounter++}`} className="text-sm leading-relaxed my-0.5">
          {parseInlineElements(itemText)}
        </li>
      );
      continue;
    }

    // 3. Ordered lists (1. Item)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        pushCurrentList();
        listType = 'ol';
      }
      const itemText = olMatch[2];
      currentList.push(
        <li key={`li-${keyCounter++}`} className="text-sm leading-relaxed my-0.5">
          {parseInlineElements(itemText)}
        </li>
      );
      continue;
    }

    // 4. Empty line (generates vertical spacing or ends active lists)
    if (trimmedLine === '') {
      pushCurrentList();
      elements.push(<div key={`space-${keyCounter++}`} className="h-1.5" />);
      continue;
    }

    // 5. Normal text / paragraph
    pushCurrentList();
    elements.push(
      <p key={`p-${keyCounter++}`} className="text-sm leading-relaxed mb-1.5">
        {parseInlineElements(line)}
      </p>
    );
  }

  // Flush any remaining active list
  pushCurrentList();

  return <div className={className}>{elements}</div>;
};
