import { NewsArticle } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

export function NewsCard({ article }: { article: NewsArticle }) {
  const pubDate = new Date(article.pubDate);
  
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="block group">
      <div className="p-4 border rounded-xl bg-card hover:bg-accent transition-colors flex flex-col h-full h-[100%]">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-primary tracking-widest uppercase">BBC Sport</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(pubDate, { addSuffix: true })}
          </span>
        </div>
        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 mt-auto">
          {article.description}
        </p>
      </div>
    </a>
  );
}
