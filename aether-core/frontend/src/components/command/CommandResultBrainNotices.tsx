import type { CommandResult } from '@/lib/CommandContext';

interface CommandResultBrainNoticesProps {
  result: CommandResult;
}

export default function CommandResultBrainNotices({ result }: CommandResultBrainNoticesProps) {
  const brain = result.brain;
  if (!brain) return null;

  return (
    <>
      {brain.globalKnowledge?.message && (
        <p
          className="mt-2 text-xs text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed"
          role="status"
        >
          {brain.globalKnowledge.message}
        </p>
      )}

      {brain.memoryNotice && (
        <p
          className="mt-2 text-xs text-sky-700/90 dark:text-sky-400/90 leading-relaxed"
          role="status"
          data-testid="brain-memory-notice"
        >
          {brain.memoryNotice}
        </p>
      )}

      {brain.reflectionNotice && (
        <p
          className="mt-2 text-xs text-violet-700/90 dark:text-violet-400/90 leading-relaxed"
          role="status"
          data-testid="brain-reflection-notice"
        >
          {brain.reflectionNotice}
        </p>
      )}

      {brain.reflectionStored && (
        <p
          className="mt-2 text-xs text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed"
          role="status"
          data-testid="brain-reflection-stored"
        >
          {brain.reflectionStored}
        </p>
      )}

      {brain.memoryRecalled && brain.memoryRecalled.length > 0 && (
        <ul
          className="mt-2 space-y-1 text-xs text-muted-foreground/90"
          data-testid="brain-memory-recalled"
        >
          {brain.memoryRecalled.map((item, index) => (
            <li key={`${item.summary}-${index}`}>
              <span className="text-foreground/80">{item.summary}</span>
              {' · '}
              <span>{item.age}</span>
              {item.kind ? (
                <>
                  {' · '}
                  <span className="uppercase tracking-wide text-primary/80">{item.kind}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {brain.knowledgeContributionNotice && (
        <p
          className="mt-2 text-xs text-muted-foreground/90 leading-relaxed"
          role="status"
          data-testid="knowledge-contribution-notice"
        >
          {brain.knowledgeContributionNotice}
        </p>
      )}
    </>
  );
}
