#!/usr/bin/env python3
"""Sync BMAD planning artifacts (epics, stories, sprint statuses) to a GitHub Project V2.

Usage (called by the GitHub Actions workflow):
  python .github/scripts/sync_to_project.py

Required environment variables:
  GH_TOKEN        – GitHub token with issues:write and projects:write scopes
  GITHUB_REPOSITORY – owner/repo (e.g. njtan142/Ledgy)
  PROJECT_NUMBER  – numeric ID of the GitHub Project V2

Optional:
  DRY_RUN         – if set to "true", print actions without executing them
"""

import json
import os
import re
import subprocess
import sys

try:
    import yaml
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml", "-q"])
    import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EPICS_MD = "_bmad-output/planning-artifacts/epics.md"
SPRINT_STATUS_YAML = "_bmad-output/implementation-artifacts/sprint-status.yaml"

# Map BMAD status keys → GitHub Project Status option names (preferred order)
STATUS_CANDIDATES: dict[str, list[str]] = {
    "backlog":     ["Backlog", "Todo", "To Do"],
    "in-progress": ["In Progress", "InProgress"],
    "review":      ["In Review", "Review", "In Progress"],
    "done":        ["Done", "Completed"],
    "optional":    ["Backlog", "Todo", "To Do"],
}

LABEL_EPIC = "epic"
LABEL_STORY = "story"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Convert a title to a dash-separated slug matching sprint-status.yaml keys."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def run_gh(*args: str, input_data: str | None = None) -> dict | str | None:
    """Run `gh` CLI and return parsed JSON (or raw stdout string)."""
    dry_run = os.getenv("DRY_RUN", "").lower() == "true"
    cmd = ["gh"] + list(args)
    if dry_run:
        # Suppress any mutating sub-commands in dry-run mode
        write_verbs = {"create", "edit", "delete", "close", "reopen"}
        subcommand = args[1] if len(args) > 1 else ""
        is_mutating = subcommand in write_verbs or (
            "api" in args and any(k in " ".join(args) for k in ("mutation", "POST", "PATCH", "DELETE"))
        )
        if is_mutating:
            print(f"  [DRY RUN] Would run: {' '.join(cmd)}")
            return None
    result = subprocess.run(cmd, capture_output=True, text=True, input=input_data)
    if result.returncode != 0:
        print(f"⚠  gh error ({' '.join(cmd[:4])}): {result.stderr.strip()}", file=sys.stderr)
        return None
    out = result.stdout.strip()
    if out:
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            return out
    return None


def graphql(query: str, **variables) -> dict | None:
    """Execute a GraphQL query/mutation via `gh api graphql`."""
    args = ["api", "graphql", "-f", f"query={query}"]
    for k, v in variables.items():
        # Numeric values need -F, strings need -f
        if isinstance(v, int):
            args.extend(["-F", f"{k}={v}"])
        else:
            args.extend(["-f", f"{k}={v}"])
    return run_gh(*args)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_epics(filepath: str) -> list[dict]:
    """Return ordered list of epic/story dicts from epics.md."""
    items: list[dict] = []
    with open(filepath, encoding="utf-8") as fh:
        content = fh.read()

    for line in content.splitlines():
        # "## Epic N: Title" lines (skip "## Epic List")
        m = re.match(r"^## Epic (\d+): (.+)$", line)
        if m:
            num = int(m.group(1))
            title = m.group(2).strip()
            items.append(
                {
                    "key": f"epic-{num}",
                    "item_type": "epic",
                    "title": f"Epic {num}: {title}",
                    "epic_num": num,
                    "story_num": None,
                    "label": LABEL_EPIC,
                }
            )
            continue

        # "### Story N.M: Title" lines
        m = re.match(r"^### Story (\d+)\.(\d+): (.+)$", line)
        if m:
            epic_num = int(m.group(1))
            story_num = int(m.group(2))
            title = m.group(3).strip()
            slug = slugify(title)
            items.append(
                {
                    "key": f"{epic_num}-{story_num}-{slug}",
                    "item_type": "story",
                    "title": f"Story {epic_num}.{story_num}: {title}",
                    "epic_num": epic_num,
                    "story_num": story_num,
                    "label": LABEL_STORY,
                }
            )

    return items


def parse_sprint_status(filepath: str) -> dict[str, str]:
    """Return {key: status} from sprint-status.yaml."""
    with open(filepath, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return data.get("development_status", {})


# ---------------------------------------------------------------------------
# GitHub Issues
# ---------------------------------------------------------------------------

def ensure_labels(repo: str) -> None:
    """Create 'epic' and 'story' labels if they don't already exist."""
    existing = run_gh("label", "list", "--repo", repo, "--json", "name") or []
    names = {lbl["name"] for lbl in existing}

    label_defs = [
        (LABEL_EPIC,  "5319e7", "BMAD epic — top-level feature group"),
        (LABEL_STORY, "0075ca", "BMAD story — implementable unit of work"),
    ]
    for name, color, description in label_defs:
        if name not in names:
            run_gh(
                "label", "create", name,
                "--repo", repo,
                "--color", color,
                "--description", description,
            )
            print(f"  ✔ Created label '{name}'")
        else:
            print(f"  · Label '{name}' already exists")


def find_or_create_issue(repo: str, title: str, label: str, body: str) -> dict | None:
    """Return existing issue node_id + number, or create a new one."""
    # Search for an existing issue with this exact title
    results = run_gh(
        "issue", "list",
        "--repo", repo,
        "--search", f'"{title}" in:title',
        "--label", label,
        "--state", "all",
        "--json", "number,id,title",
        "--limit", "10",
    ) or []

    for issue in results:
        if issue["title"].strip() == title:
            print(f"  · Issue already exists: #{issue['number']} — {title}")
            return issue

    # Create new issue — gh issue create returns the URL, not JSON
    url = run_gh(
        "issue", "create",
        "--repo", repo,
        "--title", title,
        "--body", body,
        "--label", label,
    )
    if url:
        # url is like "https://github.com/owner/repo/issues/123"
        m = re.search(r"/issues/(\d+)$", str(url))
        if m:
            number = m.group(1)
            created = run_gh("issue", "view", number, "--repo", repo, "--json", "number,id")
            if created:
                print(f"  ✔ Created issue #{created['number']} — {title}")
                return created
            print(f"  ⚠  Created issue but could not fetch details for: {title}", file=sys.stderr)
        else:
            print(f"  ⚠  Could not parse issue URL from gh output: {url}", file=sys.stderr)
    else:
        dry_run = os.getenv("DRY_RUN", "").lower() == "true"
        if dry_run:
            print(f"  [DRY RUN] Would create issue: {title}")
    return None


# ---------------------------------------------------------------------------
# GitHub Project V2
# ---------------------------------------------------------------------------

def get_project(owner: str, project_number: int) -> dict | None:
    """Fetch project ID, status-field ID, and available status options.

    GitHub's `repositoryOwner` interface does not expose `projectV2`; only the
    concrete `User` and `Organization` types do.  We try both in turn.
    """
    fields_fragment = """
      id
      title
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name }
          }
        }
      }
"""
    for owner_type in ("user", "organization"):
        query = f"""
query($login: String!, $number: Int!) {{
  {owner_type}(login: $login) {{
    projectV2(number: $number) {{{fields_fragment}    }}
  }}
}}
"""
        data = graphql(query, login=owner, number=project_number)
        if not data:
            continue
        project = data.get("data", {}).get(owner_type, {}) or {}
        project = project.get("projectV2")
        if project:
            return project

    print(
        f"⚠  Project #{project_number} not found for owner '{owner}'. "
        "Check that the project exists and the token has 'project' scope.",
        file=sys.stderr,
    )
    return None


def get_status_field(project: dict) -> tuple[str | None, dict[str, str]]:
    """Return (field_id, {option_name_lower: option_id}) for the Status field."""
    for node in project.get("fields", {}).get("nodes", []):
        if isinstance(node, dict) and node.get("name", "").lower() == "status":
            options = {opt["name"].lower(): opt["id"] for opt in node.get("options", [])}
            return node["id"], options
    return None, {}


def resolve_status_option(bmad_status: str, options: dict[str, str]) -> str | None:
    """Find the best matching project option ID for a BMAD status string."""
    candidates = STATUS_CANDIDATES.get(bmad_status, [bmad_status.title()])
    for candidate in candidates:
        opt_id = options.get(candidate.lower())
        if opt_id:
            return opt_id
    return None


def add_item_to_project(project_id: str, issue_node_id: str) -> str | None:
    """Add an issue to the project and return the new item's node ID."""
    mutation = """
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
"""
    data = graphql(mutation, projectId=project_id, contentId=issue_node_id)
    if not data:
        return None
    return (
        data.get("data", {})
        .get("addProjectV2ItemById", {})
        .get("item", {})
        .get("id")
    )


def set_status_field(
    project_id: str, item_id: str, field_id: str, option_id: str
) -> bool:
    """Set the single-select Status field on a project item."""
    mutation = """
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }
  ) {
    projectV2Item { id }
  }
}
"""
    data = graphql(
        mutation,
        projectId=project_id,
        itemId=item_id,
        fieldId=field_id,
        optionId=option_id,
    )
    return data is not None


# ---------------------------------------------------------------------------
# Issue body builders
# ---------------------------------------------------------------------------

def epic_body(key: str, status: str) -> str:
    return (
        f"**BMAD Epic** · key: `{key}` · status: `{status}`\n\n"
        "Source: `_bmad-output/planning-artifacts/epics.md`\n\n"
        "> This issue was created automatically by the "
        "[sync-to-project](.github/workflows/sync-to-project.yml) workflow."
    )


def story_body(key: str, epic_num: int, story_num: int, status: str) -> str:
    return (
        f"**BMAD Story** · key: `{key}` · epic: `epic-{epic_num}` · status: `{status}`\n\n"
        "Source: `_bmad-output/planning-artifacts/epics.md`\n\n"
        "> This issue was created automatically by the "
        "[sync-to-project](.github/workflows/sync-to-project.yml) workflow."
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    project_number_str = os.environ.get("PROJECT_NUMBER", "")
    dry_run = os.getenv("DRY_RUN", "").lower() == "true"

    if not repo:
        print("Error: GITHUB_REPOSITORY is not set.", file=sys.stderr)
        return 1
    if not project_number_str:
        print("Error: PROJECT_NUMBER is not set.", file=sys.stderr)
        return 1

    try:
        project_number = int(project_number_str)
    except ValueError:
        print(f"Error: PROJECT_NUMBER must be an integer, got '{project_number_str}'.", file=sys.stderr)
        return 1

    owner = repo.split("/")[0]

    if dry_run:
        print("⚡ DRY RUN — no GitHub objects will be created or modified\n")

    # -- Parse planning artifacts ------------------------------------------
    print(f"\n📂 Parsing {EPICS_MD} …")
    items = parse_epics(EPICS_MD)
    print(f"   Found {sum(1 for i in items if i['item_type'] == 'epic')} epics, "
          f"{sum(1 for i in items if i['item_type'] == 'story')} stories")

    print(f"\n📂 Parsing {SPRINT_STATUS_YAML} …")
    sprint_status = parse_sprint_status(SPRINT_STATUS_YAML)
    print(f"   Found {len(sprint_status)} status entries")

    # -- Ensure labels exist -----------------------------------------------
    print(f"\n🏷  Ensuring labels exist in {repo} …")
    ensure_labels(repo)

    # -- Ensure issues exist -----------------------------------------------
    print(f"\n📝 Syncing issues to {repo} …")
    issue_map: dict[str, dict] = {}  # key → {number, id}
    for item in items:
        key = item["key"]
        status = sprint_status.get(key, "backlog")
        if item["item_type"] == "epic":
            body = epic_body(key, status)
        else:
            body = story_body(key, item["epic_num"], item["story_num"], status)

        issue = find_or_create_issue(repo, item["title"], item["label"], body)
        if issue:
            issue_map[key] = issue

    # -- Fetch project -----------------------------------------------------
    print(f"\n📋 Fetching GitHub Project #{project_number} …")
    project = get_project(owner, project_number)
    if not project:
        return 1
    print(f"   Project: {project.get('title', '?')} (id={project['id']})")

    field_id, status_options = get_status_field(project)
    if field_id:
        print(f"   Status field found with options: {list(status_options.keys())}")
    else:
        print("   ⚠  No 'Status' single-select field found — items will be added without status.")

    # -- Add items to project and set status -------------------------------
    print(f"\n➕ Adding items to project …")
    for item in items:
        key = item["key"]
        issue = issue_map.get(key)
        if not issue:
            continue

        if dry_run:
            print(f"  [DRY RUN] Would add #{issue.get('number')} ({key}) to project")
            continue

        item_id = add_item_to_project(project["id"], issue["id"])
        if not item_id:
            print(f"  ⚠  Could not add #{issue.get('number')} to project")
            continue

        bmad_status = sprint_status.get(key, "backlog")
        if field_id:
            opt_id = resolve_status_option(bmad_status, status_options)
            if opt_id:
                ok = set_status_field(project["id"], item_id, field_id, opt_id)
                status_label = f"status={bmad_status}" if ok else "status=?? (field update failed)"
            else:
                status_label = f"status={bmad_status} (no matching project option)"
        else:
            status_label = "no status field"

        print(f"  ✔ #{issue.get('number')} added — {key} [{status_label}]")

    print("\n✅ Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
