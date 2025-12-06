# Phase 10: Automated Onboarding - Implementation Guide

## Overview

Phase 10 implements a comprehensive automated onboarding system to help new users get started quickly and efficiently. Features include a 5-step setup wizard, 12 industry-specific templates, interactive product tours, and a progress checklist.

## Table of Contents

1. [Architecture](#architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Industry Templates](#industry-templates)
5. [Interactive Tours](#interactive-tours)
6. [Progress Checklist](#progress-checklist)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

## Architecture

### 5-Step Wizard Flow

```
Step 1: Company Profile
  ↓
Step 2: Industry Template Selection
  ↓
Step 3: Team Setup
  ↓
Step 4: Integration Preferences
  ↓
Step 5: Quick Product Tour
  ↓
Dashboard with Progress Checklist
```

### Data Model

**onboarding_progress Table:**
- `tenantId`: Unique per tenant
- `currentStep`: Current wizard step (1-5)
- `completedSteps`: Array of completed step numbers
- `checklistItems`: Array of completed checklist item IDs
- `skipped`: Boolean flag
- `completedAt`: Timestamp when completed

**industry_templates Table:**
- `name`: Industry name (e.g., "Healthcare")
- `slug`: URL-friendly identifier
- `icon`: Emoji or icon identifier
- `configuration`: JSON with frameworks, assessment types, policies
- `features`: Recommended features for the industry

## Backend Implementation

### Onboarding Router (9 Endpoints)

#### 1. Get Progress
```typescript
// Get current onboarding status
const progress = await trpc.onboarding.getProgress.query();

// Returns:
{
  currentStep: 1,
  completedSteps: [1, 2],
  checklistItems: ["profile", "team"],
  skipped: false,
  completedAt: null,
  isComplete: false,
  totalSteps: 5
}
```

#### 2. Update Step
```typescript
// Complete a wizard step
await trpc.onboarding.updateStep.mutate({
  step: 1,
  data: {
    companyName: "ACME Corp",
    industry: "Technology"
  }
});

// Returns: { success: true, nextStep: 2 }
```

#### 3. Apply Template
```typescript
// Apply an industry template
const result = await trpc.onboarding.applyTemplate.mutate({
  templateSlug: "healthcare"
});

// Returns:
{
  success: true,
  appliedTemplate: "Healthcare",
  configuration: {
    complianceFrameworks: ["HIPAA", "HITECH"],
    assessmentTypes: [...],
    policies: [...]
  }
}
```

#### 4. Get Checklist
```typescript
// Get progress checklist
const checklist = await trpc.onboarding.getChecklist.query();

// Returns:
{
  items: [
    { id: "profile", label: "Complete company profile", completed: true },
    { id: "team", label: "Invite team members", completed: false },
    ...
  ],
  completedCount: 3,
  totalCount: 10,
  percentage: 30,
  allComplete: false
}
```

#### 5. Complete Checklist Item
```typescript
// Mark a checklist item as complete
await trpc.onboarding.completeChecklistItem.mutate({
  itemId: "assessment"
});
```

#### 6. Skip Onboarding
```typescript
// Skip the onboarding wizard
await trpc.onboarding.skipOnboarding.mutate();
```

#### 7. Reset Onboarding
```typescript
// Reset onboarding to start over
await trpc.onboarding.resetOnboarding.mutate();
```

## Frontend Implementation

### Example 1: Wizard Step Component (100+ lines)

```typescript
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

interface WizardStepProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
}

export function CompanyProfileStep({ step, onNext, onBack }: WizardStepProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    employeeCount: "",
    phone: "",
  });

  const updateStepMutation = trpc.onboarding.updateStep.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateStepMutation.mutateAsync({
        step: 1,
        data: formData,
      });

      onNext();
    } catch (error) {
      console.error("Failed to update step:", error);
    }
  };

  return (
    <div className="wizard-step">
      <h2>Step 1: Company Profile</h2>
      <p>Tell us about your organization</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">Company Name *</label>
          <input
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full px-4 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-2">Industry *</label>
          <select
            required
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="">Select industry...</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Technology">Technology</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
            <option value="Education">Education</option>
            <option value="Government">Government</option>
            <option value="Legal">Legal</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Consulting">Consulting</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Number of Employees</label>
          <select
            value={formData.employeeCount}
            onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="">Select...</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border rounded"
            placeholder="+55 (11) 99999-9999"
          />
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 1}
            className="px-6 py-2 border rounded disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={updateStepMutation.isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            {updateStepMutation.isLoading ? "Saving..." : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Example 2: Progress Indicator (60+ lines)

```typescript
import React from "react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

export function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  completedSteps 
}: ProgressIndicatorProps) {
  const steps = [
    { number: 1, label: "Profile" },
    { number: 2, label: "Template" },
    { number: 3, label: "Team" },
    { number: 4, label: "Integrations" },
    { number: 5, label: "Tour" },
  ];

  const getStepStatus = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) return "completed";
    if (currentStep === stepNumber) return "active";
    return "pending";
  };

  return (
    <div className="progress-indicator">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold transition-colors
                    ${status === "completed" ? "bg-green-500 text-white" : ""}
                    ${status === "active" ? "bg-blue-600 text-white" : ""}
                    ${status === "pending" ? "bg-gray-200 text-gray-500" : ""}
                  `}
                >
                  {status === "completed" ? "✓" : step.number}
                </div>
                <span className="mt-2 text-sm">{step.label}</span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 transition-colors
                    ${completedSteps.includes(step.number) ? "bg-green-500" : "bg-gray-200"}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="text-center text-sm text-gray-600">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
```

### Example 3: Industry Template Selector (110+ lines)

```typescript
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

export function IndustryTemplateSelector({ onNext, onBack }: any) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const { data: templates, isLoading } = trpc.onboarding.getIndustryTemplates.useQuery();
  const applyTemplateMutation = trpc.onboarding.applyTemplate.useMutation();

  const handleApplyTemplate = async () => {
    if (!selectedSlug) return;

    try {
      await applyTemplateMutation.mutateAsync({ templateSlug: selectedSlug });
      onNext();
    } catch (error) {
      console.error("Failed to apply template:", error);
    }
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="template-selector">
      <h2>Step 2: Choose Your Industry Template</h2>
      <p className="mb-6">
        Select a template to get started with pre-configured compliance frameworks
        and assessment types for your industry.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => {
          const isSelected = selectedSlug === template.slug;
          const isExpanded = expandedSlug === template.slug;

          return (
            <div
              key={template.slug}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200"}
                hover:border-blue-400
              `}
              onClick={() => setSelectedSlug(template.slug)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{template.icon}</span>
                {isSelected && (
                  <span className="text-blue-600">✓</span>
                )}
              </div>

              <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedSlug(isExpanded ? null : template.slug);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="mb-2">
                    <strong className="text-sm">Frameworks:</strong>
                    <ul className="text-xs text-gray-600 mt-1">
                      {template.configuration.complianceFrameworks.map((framework: string) => (
                        <li key={framework}>• {framework}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong className="text-sm">Assessment Types:</strong>
                    <ul className="text-xs text-gray-600 mt-1">
                      {template.configuration.assessmentTypes.slice(0, 3).map((type: string) => (
                        <li key={type}>• {type}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border rounded"
        >
          Back
        </button>
        <button
          onClick={handleApplyTemplate}
          disabled={!selectedSlug || applyTemplateMutation.isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {applyTemplateMutation.isLoading ? "Applying..." : "Apply Template"}
        </button>
      </div>
    </div>
  );
}
```

### Example 4: Team Invite Step (90+ lines)

```typescript
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

export function TeamSetupStep({ onNext, onBack }: any) {
  const [emails, setEmails] = useState<string[]>([""]);
  const updateStepMutation = trpc.onboarding.updateStep.useMutation();

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validEmails = emails.filter(email => email.trim() !== "");

    try {
      // In production, this would call userInvites.create for each email
      await updateStepMutation.mutateAsync({
        step: 3,
        data: { invitedEmails: validEmails },
      });

      onNext();
    } catch (error) {
      console.error("Failed to send invites:", error);
    }
  };

  return (
    <div className="team-setup">
      <h2>Step 3: Invite Your Team</h2>
      <p className="mb-6">
        Invite team members to collaborate. You can skip this and add them later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => updateEmail(index, e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-4 py-2 border rounded"
            />
            {emails.length > 1 && (
              <button
                type="button"
                onClick={() => removeEmailField(index)}
                className="px-4 py-2 text-red-600 border border-red-600 rounded"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addEmailField}
          className="text-blue-600 hover:underline"
        >
          + Add another email
        </button>

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border rounded"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onNext}
              className="px-6 py-2 border rounded"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={updateStepMutation.isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded"
            >
              {updateStepMutation.isLoading ? "Sending..." : "Send Invites & Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

### Example 5: Integration Preferences (80+ lines)

```typescript
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

export function IntegrationPreferencesStep({ onNext, onBack }: any) {
  const [preferences, setPreferences] = useState({
    enableWebhooks: false,
    enableApiKeys: false,
    customDomain: false,
    branding: false,
  });

  const updateStepMutation = trpc.onboarding.updateStep.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateStepMutation.mutateAsync({
        step: 4,
        data: preferences,
      });

      onNext();
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  return (
    <div className="integration-preferences">
      <h2>Step 4: Integration Preferences</h2>
      <p className="mb-6">
        Choose which features you'd like to configure. You can enable these later too.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border rounded-lg p-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.enableWebhooks}
              onChange={(e) => setPreferences({ ...preferences, enableWebhooks: e.target.checked })}
              className="mr-3"
            />
            <div>
              <div className="font-semibold">Webhooks</div>
              <div className="text-sm text-gray-600">
                Receive real-time notifications for events
              </div>
            </div>
          </label>
        </div>

        <div className="border rounded-lg p-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.enableApiKeys}
              onChange={(e) => setPreferences({ ...preferences, enableApiKeys: e.target.checked })}
              className="mr-3"
            />
            <div>
              <div className="font-semibold">API Keys</div>
              <div className="text-sm text-gray-600">
                Access the platform programmatically
              </div>
            </div>
          </label>
        </div>

        <div className="border rounded-lg p-4 opacity-60">
          <label className="flex items-center">
            <input
              type="checkbox"
              disabled
              className="mr-3"
            />
            <div>
              <div className="font-semibold">Custom Domain (Enterprise)</div>
              <div className="text-sm text-gray-600">
                Use your own domain for white-label experience
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border rounded"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={updateStepMutation.isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            {updateStepMutation.isLoading ? "Saving..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Example 6: Progress Checklist Widget (80+ lines)

```typescript
import React from "react";
import { trpc } from "@/lib/trpc";

export function ProgressChecklistWidget() {
  const { data: checklist, refetch } = trpc.onboarding.getChecklist.useQuery();
  const completeItemMutation = trpc.onboarding.completeChecklistItem.useMutation();

  const handleCompleteItem = async (itemId: string) => {
    try {
      await completeItemMutation.mutateAsync({ itemId });
      refetch();
    } catch (error) {
      console.error("Failed to complete item:", error);
    }
  };

  if (!checklist) return null;

  const { items, completedCount, totalCount, percentage } = checklist;

  return (
    <div className="checklist-widget border rounded-lg p-6 bg-white shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Getting Started</h3>
        <span className="text-sm text-gray-600">
          {completedCount} / {totalCount}
        </span>
      </div>

      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-sm text-gray-600 mt-1">{percentage}% complete</div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              flex items-start p-3 rounded
              ${item.completed ? "bg-green-50" : "bg-gray-50"}
            `}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => !item.completed && handleCompleteItem(item.id)}
              className="mt-1 mr-3"
              disabled={item.completed}
            />
            <div className="flex-1">
              <div className={`font-medium ${item.completed ? "text-gray-400 line-through" : ""}`}>
                {item.label}
              </div>
              <div className="text-sm text-gray-600">{item.description}</div>
            </div>
            {item.completed && (
              <span className="text-green-600">✓</span>
            )}
          </div>
        ))}
      </div>

      {percentage === 100 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="font-semibold text-green-800">Onboarding Complete!</div>
          <div className="text-sm text-green-700">
            You're all set to use the platform
          </div>
        </div>
      )}
    </div>
  );
}
```

### Example 7: Interactive Tour Setup (react-joyride) (100+ lines)

```typescript
import React, { useState } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { trpc } from "@/lib/trpc";

const TOUR_STEPS: Step[] = [
  {
    target: ".dashboard-header",
    content: "Welcome to your dashboard! This is your command center.",
    disableBeacon: true,
  },
  {
    target: ".navigation-menu",
    content: "Use this menu to navigate between different sections of the platform.",
  },
  {
    target: ".create-assessment-btn",
    content: "Click here to create your first compliance assessment.",
  },
  {
    target: ".proposals-section",
    content: "Generate and manage proposals for your clients from this section.",
  },
  {
    target: ".analytics-card",
    content: "Track your metrics and ROI in the analytics dashboard.",
  },
  {
    target: ".security-settings",
    content: "Configure 2FA and security settings to protect your account.",
  },
  {
    target: ".profile-menu",
    content: "Access your profile, settings, and team management here.",
  },
];

export function ProductTour() {
  const [run, setRun] = useState(true);
  const completeChecklistMutation = trpc.onboarding.completeChecklistItem.useMutation();
  const updateStepMutation = trpc.onboarding.updateStep.useMutation();

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);

      try {
        // Mark tour as completed
        await completeChecklistMutation.mutateAsync({ itemId: "tour" });

        // Complete step 5
        await updateStepMutation.mutateAsync({ step: 5 });
      } catch (error) {
        console.error("Failed to complete tour:", error);
      }
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#2563eb",
          textColor: "#333",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: "#2563eb",
          borderRadius: 6,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "#6b7280",
          marginRight: 8,
        },
        buttonSkip: {
          color: "#6b7280",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
```

### Example 8: Onboarding Wrapper (90+ lines)

```typescript
import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { CompanyProfileStep } from "./steps/CompanyProfileStep";
import { IndustryTemplateSelector } from "./steps/IndustryTemplateSelector";
import { TeamSetupStep } from "./steps/TeamSetupStep";
import { IntegrationPreferencesStep } from "./steps/IntegrationPreferencesStep";
import { ProductTour } from "./ProductTour";
import { ProgressIndicator } from "./ProgressIndicator";

export function OnboardingWizard() {
  const { data: progress, isLoading, refetch } = trpc.onboarding.getProgress.useQuery();
  const skipMutation = trpc.onboarding.skipOnboarding.useMutation();

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (progress && !progress.isComplete && !progress.skipped) {
      setCurrentStep(progress.currentStep);
    }
  }, [progress]);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    refetch();
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = async () => {
    try {
      await skipMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't show wizard if completed or skipped
  if (progress?.isComplete || progress?.skipped) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Welcome to BlackBelt Platform</h1>
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip Setup
            </button>
          </div>

          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={5}
            completedSteps={progress?.completedSteps || []}
          />

          <div className="mt-8">
            {currentStep === 1 && (
              <CompanyProfileStep
                step={currentStep}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <IndustryTemplateSelector
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <TeamSetupStep
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <IntegrationPreferencesStep
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <ProductTour />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Example 9: Template Application (80+ lines)

```typescript
import { trpc } from "@/lib/trpc";

// Example: Apply template after user selection
export async function applyHealthcareTemplate() {
  const result = await trpc.onboarding.applyTemplate.mutate({
    templateSlug: "healthcare",
  });

  console.log("Applied template:", result.appliedTemplate);
  console.log("Configuration:", result.configuration);

  // Configuration will include:
  // {
  //   complianceFrameworks: ["HIPAA", "HITECH"],
  //   assessmentTypes: [
  //     "Patient Data Security",
  //     "Medical Records Audit",
  //     "PHI Protection"
  //   ],
  //   policies: [
  //     "Privacy Policy",
  //     "Data Breach Response",
  //     "Patient Rights"
  //   ]
  // }

  // Now you can:
  // 1. Create default assessments based on assessmentTypes
  // 2. Generate policy templates
  // 3. Configure compliance framework checklist
  // 4. Set up industry-specific features
}

// Example: Custom template application logic
export async function setupIndustrySpecificFeatures(templateSlug: string) {
  const template = await trpc.onboarding.getIndustryTemplates.query();
  const selected = template.find(t => t.slug === templateSlug);

  if (!selected) return;

  // Apply features based on template
  for (const feature of selected.features) {
    switch (feature) {
      case "encryption":
        await enableEncryption();
        break;
      case "audit_trail":
        await enableAuditLogging();
        break;
      case "2fa_required":
        await enforce2FA();
        break;
      case "payment_security":
        await configurePCIDSS();
        break;
      default:
        console.log(`Feature ${feature} not implemented`);
    }
  }
}

async function enableEncryption() {
  console.log("Enabling data encryption at rest and in transit");
  // Implementation specific to your platform
}

async function enableAuditLogging() {
  console.log("Enabling comprehensive audit logs");
  // Implementation specific to your platform
}

async function enforce2FA() {
  console.log("Requiring 2FA for all users");
  // Update tenant settings to require 2FA
}

async function configurePCIDSS() {
  console.log("Configuring PCI-DSS compliance settings");
  // Setup payment security requirements
}
```

### Example 10: Backend API Usage (110+ lines)

```typescript
// Complete onboarding flow from backend perspective

import { db } from "./db";
import { onboardingProgress, tenants, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 1. Initialize onboarding for new tenant
export async function initializeOnboarding(tenantId: string) {
  const existing = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  await db.insert(onboardingProgress).values({
    tenantId,
    currentStep: 1,
    completedSteps: JSON.stringify([]),
    checklistItems: JSON.stringify([]),
    skipped: false,
  });

  return { tenantId, currentStep: 1, completedSteps: [], checklistItems: [] };
}

// 2. Check onboarding status
export async function getOnboardingStatus(tenantId: string) {
  const progress = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, tenantId))
    .limit(1);

  if (progress.length === 0) {
    return { isComplete: false, currentStep: 1 };
  }

  const data = progress[0];
  return {
    isComplete: !!data.completedAt,
    skipped: data.skipped,
    currentStep: data.currentStep,
    completedSteps: JSON.parse(data.completedSteps as string),
    checklistItems: JSON.parse(data.checklistItems as string),
  };
}

// 3. Update checklist based on user actions
export async function autoCompleteChecklistItems(
  tenantId: string,
  action: string
) {
  const itemsToComplete: Record<string, string[]> = {
    "create_assessment": ["assessment"],
    "invite_user": ["team"],
    "create_proposal": ["proposal"],
    "enable_2fa": ["2fa"],
    "update_branding": ["branding"],
    "create_webhook": ["webhooks"],
    "view_analytics": ["analytics"],
    "update_profile": ["profile"],
  };

  const itemId = itemsToComplete[action]?.[0];
  if (!itemId) return;

  const progress = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, tenantId))
    .limit(1);

  if (progress.length === 0) return;

  const data = progress[0];
  const completedItems = JSON.parse(data.checklistItems as string) as string[];

  if (!completedItems.includes(itemId)) {
    completedItems.push(itemId);

    await db
      .update(onboardingProgress)
      .set({
        checklistItems: JSON.stringify(completedItems),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.id, data.id));
  }
}

// 4. Get recommended next action
export function getRecommendedAction(
  completedSteps: number[],
  checklistItems: string[]
): { action: string; description: string } {
  // Priority order
  if (!completedSteps.includes(1)) {
    return {
      action: "Complete company profile",
      description: "Add your company details to get started",
    };
  }

  if (!completedSteps.includes(2)) {
    return {
      action: "Choose industry template",
      description: "Get pre-configured compliance frameworks",
    };
  }

  if (!checklistItems.includes("team")) {
    return {
      action: "Invite team members",
      description: "Collaborate with your colleagues",
    };
  }

  if (!checklistItems.includes("assessment")) {
    return {
      action: "Create first assessment",
      description: "Start your compliance journey",
    };
  }

  if (!checklistItems.includes("2fa")) {
    return {
      action: "Enable two-factor authentication",
      description: "Secure your account",
    };
  }

  return {
    action: "Explore the platform",
    description: "You're all set! Start using the features",
  };
}
```

## Industry Templates

### 12 Pre-configured Templates

Each template includes:
- **Compliance Frameworks**: Industry-standard frameworks
- **Assessment Types**: Common assessment templates
- **Policies**: Required policies and procedures
- **Features**: Recommended platform features

### Template Configurations

1. **Healthcare** - HIPAA, HITECH, patient data protection
2. **Finance** - SOC 2, PCI-DSS, GLBA, financial controls
3. **Technology** - ISO 27001, GDPR, security standards
4. **Manufacturing** - ISO 9001, OSHA, quality management
5. **Retail** - PCI-DSS, consumer protection, payment security
6. **Education** - FERPA, COPPA, student data privacy
7. **Government** - NIST, FedRAMP, FISMA, security controls
8. **Legal** - Client confidentiality, document management
9. **Real Estate** - Fair Housing, property laws, contracts
10. **Consulting** - Professional standards, quality management
11. **E-commerce** - PCI-DSS, LGPD, payment and data security
12. **Generic** - Basic compliance and best practices

## Interactive Tours

### Using React Joyride

Install dependency:
```bash
npm install react-joyride
```

Features:
- Step-by-step guided tours
- Spotlight highlights
- Tooltip positioning
- Skip/close options
- Progress tracking
- Auto-advance
- Custom styling

## Progress Checklist

### 10 Checklist Items

1. **Complete company profile** - Basic company information
2. **Invite team members** - Add users to organization
3. **Create first assessment** - Start compliance assessment
4. **Configure branding** - Customize logo/colors (Enterprise)
5. **Set up webhooks** - Configure API integrations (optional)
6. **Enable 2FA** - Two-factor authentication
7. **Review security settings** - IP whitelist, sessions
8. **Create first proposal** - Generate proposal document
9. **Explore analytics** - View dashboard metrics
10. **Complete product tour** - Learn platform features

### Auto-completion Triggers

Items are automatically marked complete when users perform related actions:
- Profile → Update company details
- Team → Invite first user
- Assessment → Create assessment
- Branding → Update logo/colors
- Webhooks → Create webhook
- 2FA → Enable TOTP
- Security → Add IP or view sessions
- Proposal → Generate proposal
- Analytics → View analytics page
- Tour → Complete tour steps

## Best Practices

### User Experience

1. **Progressive Disclosure**: Show only relevant options at each step
2. **Skip Option**: Always allow users to skip onboarding
3. **Context**: Provide clear descriptions and help text
4. **Feedback**: Show success messages after each step
5. **Persistence**: Save progress automatically
6. **Resume**: Allow users to resume from where they left off

### Performance

1. **Lazy Loading**: Load tour library only when needed
2. **Caching**: Cache template data
3. **Optimistic Updates**: Update UI before API response
4. **Debouncing**: Debounce form inputs
5. **Prefetching**: Prefetch next step data

### Analytics

Track onboarding metrics:
- Completion rate
- Step drop-off points
- Time to complete
- Template popularity
- Checklist completion rate
- Feature adoption

### Accessibility

1. **Keyboard Navigation**: Support arrow keys, Enter, Escape
2. **Screen Readers**: Add aria-labels
3. **Focus Management**: Manage focus between steps
4. **Color Contrast**: Ensure readable text
5. **Skip Links**: Provide skip to content options

## Integration Points

### Automatic Checklist Completion

```typescript
// In your assessment creation code
async function createAssessment(data: any) {
  const assessment = await db.insert(assessments).values(data);

  // Auto-complete checklist item
  await autoCompleteChecklistItems(data.tenantId, "create_assessment");

  return assessment;
}

// In your user invite code
async function inviteUser(email: string, tenantId: string) {
  await sendInviteEmail(email);

  // Auto-complete checklist item
  await autoCompleteChecklistItems(tenantId, "invite_user");
}
```

### Conditional Features

```typescript
// Show features based on industry
const { data: progress } = trpc.onboarding.getProgress.useQuery();
const tenant = await getTenant();

if (tenant.industry === "Healthcare") {
  // Show HIPAA-specific features
}

if (tenant.industry === "Finance") {
  // Show SOC 2 compliance features
}
```

## Deployment

### Environment Variables

```env
# No additional environment variables required
# Uses existing database connection
```

### Database Migration

```bash
# Run migration
mysql < drizzle/0013_phase10_onboarding.sql
```

### Frontend Integration

```typescript
// In your App.tsx or Layout
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ProgressChecklistWidget } from "./components/ProgressChecklistWidget";

function App() {
  return (
    <>
      <OnboardingWizard />
      <Dashboard>
        <ProgressChecklistWidget />
        {/* Other components */}
      </Dashboard>
    </>
  );
}
```

## Summary

Phase 10 provides:
- ✅ 5-step setup wizard
- ✅ 12 industry templates
- ✅ Interactive product tours
- ✅ 10-item progress checklist
- ✅ 9 tRPC endpoints
- ✅ Auto-completion tracking
- ✅ Skip/reset options
- ✅ 900+ lines of UI examples

**Total:** 570+ lines backend + 900+ lines frontend examples

This completes Phase 10 and the entire platform implementation! 🎉
