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

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const parseTableRow = (rowText: string): string[] => {
    const trimmed = rowText.trim();
    let cells = trimmed.split('|');
    if (trimmed.startsWith('|')) {
      cells.shift();
    }
    if (trimmed.endsWith('|') && cells.length > 0) {
      cells.pop();
    }
    return cells.map(c => c.trim());
  };

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

  const pushCurrentTable = () => {
    if (inTable && tableHeaders.length > 0) {
      elements.push(
        <div key={`table-wrapper-${keyCounter++}`} className="my-4 w-full overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-left">
              <tr>
                {tableHeaders.map((header, idx) => (
                  <th key={`th-${idx}`} className="h-10 px-4 align-middle font-semibold text-muted-foreground whitespace-nowrap bg-muted/30">
                    {parseInlineElements(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="hover:bg-muted/30 transition-colors odd:bg-muted/10">
                  {row.map((cell, cellIdx) => (
                    <td key={`td-${cellIdx}`} className="p-3 align-middle text-foreground">
                      {parseInlineElements(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Table parsing
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const isNextLineSeparator = nextLine.includes('|') && nextLine.includes('-') && /^[|\s:-]+$/.test(nextLine);

    if (!inTable && trimmedLine.startsWith('|') && isNextLineSeparator) {
      pushCurrentList();
      inTable = true;
      tableHeaders = parseTableRow(line);
      i++; // Skip the separator line
      continue;
    }

    if (inTable) {
      if (trimmedLine.startsWith('|')) {
        tableRows.push(parseTableRow(line));
        continue;
      } else {
        pushCurrentTable();
        // Fall through to let standard parsing check this line
      }
    }

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

  // Flush any remaining active list or table
  pushCurrentList();
  pushCurrentTable();

  return <div className={className}>{elements}</div>;
};
