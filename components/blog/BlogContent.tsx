import { Fragment, type ReactNode } from "react";

// Renders a post body written in a light, safe markup:
//   ## Heading            → h2
//   ### Heading           → h3
//   > quote               → blockquote
//   - item / * item       → bulleted list
//   1. item               → numbered list
//   blank line            → new paragraph
// Inline: **bold**, *italic*, `code`, and [text](https://link)
// It builds React nodes (no dangerouslySetInnerHTML), so the content is
// always escaped — safe even though only the admin writes it.

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Order matters: images (![alt](url)) before links, then bold, italic, code.
  const re = /(!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\))|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(<img key={key++} src={m[3]} alt={m[2]} className="my-1 inline-block max-h-72 rounded-lg align-middle" loading="lazy" />);
    } else if (m[4]) {
      nodes.push(
        <a key={key++} href={m[6]} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-deep underline underline-offset-2 hover:text-gold">
          {m[5]}
        </a>,
      );
    } else if (m[7]) {
      nodes.push(<strong key={key++} className="font-bold text-ink">{m[8]}</strong>);
    } else if (m[9]) {
      nodes.push(<em key={key++}>{m[10]}</em>);
    } else if (m[11]) {
      nodes.push(<code key={key++} className="rounded bg-chalk px-1.5 py-0.5 text-[0.9em] font-semibold text-ink/80">{m[12]}</code>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function BlogContent({ body }: { body: string }) {
  const lines = (body || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={k++} className="text-[15.5px] leading-[1.85] text-ink/75">{inline(para.join(" "))}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={i} className="leading-[1.8]">{inline(it)}</li>);
      blocks.push(
        list.ordered
          ? <ol key={k++} className="ml-5 list-decimal space-y-1.5 text-[15.5px] text-ink/75 marker:text-gold-deep marker:font-bold">{items}</ol>
          : <ul key={k++} className="ml-5 list-disc space-y-1.5 text-[15.5px] text-ink/75 marker:text-gold">{items}</ul>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }

    const h2 = /^##\s+(.*)/.exec(line);
    const h3 = /^###\s+(.*)/.exec(line);
    const quote = /^>\s+(.*)/.exec(line);
    const bullet = /^[-*]\s+(.*)/.exec(line);
    const numbered = /^\d+\.\s+(.*)/.exec(line);
    const image = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/.exec(line.trim());

    if (image) {
      flushPara(); flushList();
      blocks.push(
        <figure key={k++} className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image[2]} alt={image[1]} className="w-full rounded-2xl border border-line" loading="lazy" />
          {image[1] && <figcaption className="mt-2 text-center text-[13px] text-ink/50">{image[1]}</figcaption>}
        </figure>,
      );
    }
    else if (h3) { flushPara(); flushList(); blocks.push(<h3 key={k++} className="mt-8 font-display text-lg font-bold text-ink">{inline(h3[1])}</h3>); }
    else if (h2) { flushPara(); flushList(); blocks.push(<h2 key={k++} className="mt-10 font-display text-2xl font-bold text-ink">{inline(h2[1])}</h2>); }
    else if (quote) { flushPara(); flushList(); blocks.push(<blockquote key={k++} className="border-l-4 border-gold bg-chalk/50 px-5 py-3 text-[15.5px] italic leading-relaxed text-ink/70">{inline(quote[1])}</blockquote>); }
    else if (bullet) { flushPara(); if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; } list.items.push(bullet[1]); }
    else if (numbered) { flushPara(); if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; } list.items.push(numbered[1]); }
    else { flushList(); para.push(line); }
  }
  flushPara(); flushList();

  return <div className="space-y-5">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
