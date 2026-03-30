

## Problem
Video descriptions are truncated with `line-clamp-3` (CSS), cutting off long text after 3 lines.

## Fix
Replace the hard clamp with an expandable description: show 3 lines by default with a "Show more" toggle that reveals the full text.

### Changes — `src/components/TikTokDownloader.tsx`

Around line 559-563, replace the clamped `<p>` with a small expandable component:

- Add a `useState` for `descriptionExpanded` (default `false`)
- Render description with `line-clamp-3` when collapsed, no clamp when expanded
- Add a "Show more" / "Show less" button below the text

```tsx
{videoData.description && (
  <div>
    <p className={`text-sm text-body leading-relaxed ${!descriptionExpanded ? 'line-clamp-3' : ''}`}>
      {videoData.description}
    </p>
    {videoData.description.length > 100 && (
      <button
        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
        className="text-xs text-primary mt-1"
      >
        {descriptionExpanded ? 'Show less' : 'Show more'}
      </button>
    )}
  </div>
)}
```

One state variable added, one block changed. No other files affected.

