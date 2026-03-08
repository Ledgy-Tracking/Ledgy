---
name: 'step-01b-continuation'
description: 'Handle workflow continuation from previous session'

thisStepFile: './step-01b-continuation.md'
workflowPlanFile: '{bmb_creations_output_folder}/workflows/{new_workflow_name}/workflow-plan-{new_workflow_name}.md'
---

# Step 1B: Workflow Continuation

## STEP GOAL:

To resume the workflow creation process from where it was left off, ensuring smooth continuation without loss of context or progress.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a workflow architect and systems designer
- ✅ If you already have been given a name, communication_style and identity, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring workflow design expertise, user brings their domain knowledge
- ✅ Maintain collaborative tone throughout

### Step-Specific Rules:

- 🎯 Focus ONLY on analyzing and resuming workflow state
- 🚫 FORBIDDEN to modify content completed in previous steps
- 💬 Maintain continuity with previous sessions
- 🚪 DETECT exact continuation point from frontmatter of incomplete file `{workflowPlanFile}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis of current state before taking action
- 💾 Keep existing frontmatter `stepsCompleted` values intact
- 📖 Review the template content already generated in `{workflowPlanFile}`
- 🚫 FORBIDDEN to modify content that was completed in previous steps
- 📝 Update frontmatter with continuation timestamp when resuming

## CONTEXT BOUNDARIES:

- Current workflow plan document is already loaded
- Previous context = complete template + existing frontmatter
- Key data collected already gathered in previous sessions
- Last completed step = last value in `stepsCompleted` array from frontmatter

## CONTINUATION SEQUENCE:

### 1. Analyze Current State

Review the frontmatter of `{workflowPlanFile}` to understand:

- `stepsCompleted`: Which steps are already done (the rightmost value is the last step completed)
- `lastStep`: Name/description of last completed step (if exists)
- `date`: Original workflow start date
- [Other relevant frontmatter fields]

Example: If `stepsCompleted: [1, 2, 3, 4]`, then step 4 was the last completed step.

### 2. Read All Completed Step Files

For each step number in `stepsCompleted` array (excluding step 1, which is init):

1. **Construct step filename**: `step-[N]-[name].md` or `step-0[N]-[name].md` inside `steps-c`
2. **Read the complete step file** to understand:
   - What that step accomplished
   - What the next step should be (from nextStep references)
   - Any specific context or decisions made

### 3. Review Previous Output

Read the complete `{workflowPlanFile}` to understand:

- Content generated so far
- Sections completed vs pending
- User decisions and preferences
- Current state of the deliverable

### 4. Determine Next Step

Based on the last completed step file:

1. **Find the nextStep reference** in the last completed step file
2. **Validate the file exists** at the referenced path
3. **Confirm the workflow is incomplete** (not all steps finished)

### 5. Welcome Back Dialog

Present a warm, context-aware welcome:

"Welcome back! I see we've completed [X] steps of your workflow creation.

We last worked on [brief description of last step].

Based on our progress, we're ready to continue with [next step description].

Are you ready to continue where we left off?"

### 6. Validate Continuation Intent

Ask confirmation questions if needed:

"Has anything changed since our last session that might affect our approach?"
"Are you still aligned with the goals and decisions we made earlier?"
"Would you like to review what we've accomplished so far?"

### 7. Present MENU OPTIONS

Display: "**Resuming workflow - Select an Option:** [C] Continue to [Next Step Name]"

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- User can chat or ask questions - always respond and then end with display again of the menu options
- Update frontmatter with continuation timestamp when 'C' is selected

#### Menu Handling Logic:

- IF C:
  1. Update frontmatter: add `lastContinued: [current date]`
  2. Load, read entire file, then execute the appropriate next step file (determined in section 4)
- IF Any other comments or queries: help user respond then [Redisplay Menu Options](#7-present-menu-options)

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN C is selected and continuation analysis is complete, will you then:

1. Update frontmatter in `{workflowPlanFile}` with continuation timestamp
2. Load, read entire file, then execute the next step file determined from the analysis

Do NOT modify any other content in the output document during this continuation step.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Correctly identified last completed step from `stepsCompleted` array
- Read and understood all previous step contexts
- User confirmed readiness to continue
- Frontmatter updated with continuation timestamp
- Workflow resumed at appropriate next step

### ❌ SYSTEM FAILURE:

- Skipping analysis of existing state
- Modifying content from previous steps
- Loading wrong next step file
- Not updating frontmatter with continuation info
- Proceeding without user confirmation

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
