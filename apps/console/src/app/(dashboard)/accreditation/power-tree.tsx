"use client";

type TreeNode = {
  userId: string;
  name: string;
  depth: number;
  children: TreeNode[];
};

function TreeBranch({ node, isLast }: { node: TreeNode; isLast: boolean }) {
  return (
    <div className="relative pl-4">
      <div className="absolute left-0 top-0 h-full w-px bg-border" />
      <div className="absolute left-0 top-3 h-px w-3 bg-border" />
      {isLast && (
        <div className="absolute left-0 top-3 bottom-0 w-px bg-background" />
      )}
      <div className="flex items-center gap-2 py-1">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
          {node.name[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="text-xs">{node.name}</span>
        {node.children.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            (+{countAll(node.children)} upstream)
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="ml-1">
          {node.children.map((child, i) => (
            <TreeBranch
              key={child.userId}
              node={child}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countAll(nodes: TreeNode[]): number {
  let c = 0;
  for (const n of nodes) {
    c += 1 + countAll(n.children);
  }
  return c;
}

export function PowerTree({ tree }: { tree: TreeNode[] }) {
  if (tree.length === 0) return null;

  return (
    <div className="max-h-64 overflow-y-auto rounded border bg-muted/20 p-3">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          Me
        </div>
        <span className="text-xs font-medium">You</span>
        <span className="text-[10px] text-muted-foreground">
          ({tree.length} direct, {countAll(tree)} total in chain)
        </span>
      </div>
      {tree.map((node, i) => (
        <TreeBranch key={node.userId} node={node} isLast={i === tree.length - 1} />
      ))}
    </div>
  );
}
