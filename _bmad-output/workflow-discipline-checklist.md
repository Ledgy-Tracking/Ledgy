# Workflow Discipline Checklist
**Purpose**: Prevent engineering mishaps through systematic process adherence  
**Scope**: All development, testing, and deployment activities  
**Compliance**: Mandatory for all agents and workflows

## Pre-Action Validation

### Before ANY Command Execution
- [ ] **State Check**: What is the current state of the system?
- [ ] **Dependency Check**: Are all required dependencies installed?
- [ ] **Process Check**: Are any long-running processes currently executing?
- [ ] **Consistency Check**: Do file changes align with intended actions?

### Before Installing Dependencies
- [ ] **Requirement Analysis**: What exactly needs to be installed?
- [ ] **File Consistency**: Do import statements match installation plans?
- [ ] **Timing Check**: Is this the right time in the workflow to install?
- [ ] **Completion Commitment**: Will I wait for installation to complete?

### Before Running Tests
- [ ] **Dependency Verification**: Are ALL test dependencies installed?
- [ ] **Installation Status**: Have any installations completed successfully?
- [ ] **Test Environment**: Is the test environment properly configured?
- [ ] **Expected Outcome**: Do I know what success/failure looks like?

## During Execution Protocols

### Long-Running Process Management
**RULE**: Once started, processes MUST complete before next action

- [ ] **Wait Protocol**: Set realistic wait times (60s+ for installations)
- [ ] **Patience Discipline**: No interruptions due to impatience
- [ ] **Status Monitoring**: Check process completion before proceeding
- [ ] **Error Handling**: If process fails, diagnose before retrying

### User Feedback Integration
**RULE**: User corrections override current approach immediately

- [ ] **Active Listening**: Parse user feedback for process corrections
- [ ] **Immediate Adaptation**: Change behavior immediately when corrected
- [ ] **No Repetition**: Never repeat a mistake user has already corrected
- [ ] **Confirmation**: Acknowledge the correction and new approach

## Process Sequence Enforcement

### Testing Workflow
```
1. ANALYZE requirements
2. INSTALL dependencies (wait for completion)
3. VERIFY installation success  
4. CONFIGURE test environment
5. RUN tests
6. INTERPRET results
7. IMPLEMENT fixes based on results
```

### Dependency Management Workflow
```
1. IDENTIFY what needs to be installed
2. CHECK current package.json state
3. INSTALL package(s) with proper wait time
4. VERIFY installation in package.json
5. TEST import functionality
6. PROCEED with dependent actions
```

### Code Change Workflow  
```
1. UNDERSTAND current state
2. PLAN changes and dependencies
3. IMPLEMENT file changes
4. UPDATE dependencies if needed
5. TEST changes work correctly
6. COMMIT only when verified
```

## Anti-Patterns to Avoid

### ❌ Impatience Anti-Patterns
- Interrupting npm install mid-process
- Starting tests before dependencies finish installing
- Making reactive changes without systematic planning
- Skipping verification steps to "save time"

### ❌ Inconsistency Anti-Patterns  
- Changing files without updating dependencies
- Installing packages for reverted code changes
- Mixing different approaches within same workflow
- Not maintaining coherent state between actions

### ❌ Feedback Ignorance Anti-Patterns
- Repeating mistakes user has corrected
- Not adapting behavior based on explicit guidance  
- Continuing failed patterns despite clear feedback
- Making same error multiple times in one session

## Verification Checkpoints

### Before Every Major Action
Ask these questions:
1. **"What is the current complete state?"**
2. **"What exactly am I trying to achieve?"** 
3. **"What dependencies does this require?"**
4. **"Is this the right sequence step?"**
5. **"Will I wait for this to complete?"**

### After User Feedback
Ask these questions:
1. **"What specific behavior needs to change?"**
2. **"How will I implement this correction immediately?"**
3. **"What pattern should I avoid repeating?"**
4. **"How will I verify I'm following the corrected approach?"**

## Emergency Protocols

### If You Realize You're About to Repeat a Mistake
1. **STOP** the current action immediately
2. **ACKNOWLEDGE** the pattern recognition
3. **REFER** to this checklist for correct approach
4. **ASK** for clarification if workflow is unclear
5. **IMPLEMENT** the corrected approach

### If User Corrects You Mid-Process
1. **ACKNOWLEDGE** the correction immediately
2. **STOP** current incorrect approach
3. **CONFIRM** understanding of correct approach
4. **IMPLEMENT** corrected workflow immediately
5. **NO REPETITION** of the corrected mistake

## Success Metrics

### Process Adherence
- Zero repeated mistakes after user correction
- Zero process interruptions due to impatience
- 100% completion rate for long-running processes
- Perfect dependency-code consistency

### Workflow Efficiency  
- Systematic progression through defined steps
- No wasted time on preventable errors
- Clear communication of process state
- Predictable, reliable execution patterns

---

**Integration**: This checklist must be consulted before EVERY engineering action  
**Compliance**: Mandatory for all development workflows  
**Updates**: Enhance based on new mishap patterns identified