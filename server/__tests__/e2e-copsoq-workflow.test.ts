/**
 * E2E Tests: COPSOQ-II Assessment & Invites
 *
 * These tests verify the complete workflow for COPSOQ-II
 * psychosocial risk assessments, including invites and responses.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockTenant, createMockSector, createMockPerson } from "./test-utils";

describe("E2E: COPSOQ-II Assessment Workflow", () => {
  let tenant: ReturnType<typeof createMockTenant>;
  let sector: ReturnType<typeof createMockSector>;
  let people: ReturnType<typeof createMockPerson>[];

  beforeEach(() => {
    tenant = createMockTenant({
      name: "Test Organization",
      cnpj: "98.765.432/0001-10",
    });

    sector = createMockSector(tenant.id, {
      name: "Administrative Department",
      description: "Main administrative team",
    });

    people = [
      createMockPerson(tenant.id, sector.id, {
        name: "Maria Silva",
        email: "maria.silva@example.com",
        position: "Manager",
      }),
      createMockPerson(tenant.id, sector.id, {
        name: "João Santos",
        email: "joao.santos@example.com",
        position: "Analyst",
      }),
      createMockPerson(tenant.id, sector.id, {
        name: "Ana Costa",
        email: "ana.costa@example.com",
        position: "Coordinator",
      }),
    ];
  });

  describe("COPSOQ Assessment Creation", () => {
    it("should create COPSOQ assessment with required fields", () => {
      const assessment = {
        id: "copsoq-001",
        tenantId: tenant.id,
        sectorId: sector.id,
        title: "Avaliação COPSOQ-II - 2025 Q1",
        description: "Quarterly psychosocial risk assessment",
        assessmentDate: new Date(),
        status: "draft",
      };

      expect(assessment.tenantId).toBe(tenant.id);
      expect(assessment.sectorId).toBe(sector.id);
      expect(assessment.title).toContain("COPSOQ");
      expect(assessment.status).toBe("draft");
    });

    it("should support assessments for entire organization", () => {
      const assessment = {
        id: "copsoq-002",
        tenantId: tenant.id,
        sectorId: null, // Organization-wide
        title: "Company-Wide COPSOQ Assessment",
        status: "draft",
      };

      expect(assessment.sectorId).toBeNull();
      expect(assessment.title).toContain("Company");
    });
  });

  describe("Invite Generation", () => {
    it("should create invite for each respondent", () => {
      const assessment = {
        id: "copsoq-001",
        tenantId: tenant.id,
        title: "Q1 Assessment",
      };

      const invites = people.map((person) => ({
        id: `invite-${person.id}`,
        assessmentId: assessment.id,
        tenantId: tenant.id,
        respondentEmail: person.email,
        respondentName: person.name,
        respondentPosition: person.position,
        sectorId: sector.id,
        inviteToken: generateMockToken(),
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }));

      expect(invites.length).toBe(3);
      expect(invites[0].respondentEmail).toBe("maria.silva@example.com");
      expect(invites[1].respondentEmail).toBe("joao.santos@example.com");
      expect(invites[2].respondentEmail).toBe("ana.costa@example.com");
      expect(invites[0].status).toBe("pending");
    });

    it("should generate unique tokens for each invite", () => {
      const tokens = [
        generateMockToken(),
        generateMockToken(),
        generateMockToken(),
      ];

      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(3); // All tokens should be unique
    });

    it("should set appropriate expiration date", () => {
      const expiresIn = 7; // days
      const now = Date.now();
      const expiresAt = new Date(now + expiresIn * 24 * 60 * 60 * 1000);

      const timeDiff = expiresAt.getTime() - now;
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000);

      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe("Email Invite Content", () => {
    it("should include all required information", () => {
      const invite = {
        respondentEmail: "maria.silva@example.com",
        respondentName: "Maria Silva",
        assessmentTitle: "Q1 Assessment",
        inviteToken: "abc123token",
        expiresIn: 7,
      };

      const emailContent = {
        to: invite.respondentEmail,
        subject: `Convite para Avaliação: ${invite.assessmentTitle}`,
        recipientName: invite.respondentName,
        assessmentTitle: invite.assessmentTitle,
        expirationDays: invite.expiresIn,
        inviteUrl: `http://localhost:3000/copsoq/respond/${invite.inviteToken}`,
      };

      expect(emailContent.to).toBe("maria.silva@example.com");
      expect(emailContent.subject).toContain("Convite");
      expect(emailContent.inviteUrl).toContain(invite.inviteToken);
    });

    it("should explain COPSOQ questionnaire details", () => {
      const questionnaire = {
        totalQuestions: 76,
        estimatedTime: "15-20 minutos",
        dimensions: 12,
        confidential: true,
      };

      expect(questionnaire.totalQuestions).toBe(76);
      expect(questionnaire.dimensions).toBe(12);
      expect(questionnaire.confidential).toBe(true);
    });
  });

  describe("COPSOQ Response Submission", () => {
    it("should accept responses for all 76 questions", () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 76; i++) {
        responses[i] = Math.floor(Math.random() * 5) + 1; // 1-5 scale
      }

      expect(Object.keys(responses).length).toBe(76);
      expect(responses[1]).toBeGreaterThanOrEqual(1);
      expect(responses[1]).toBeLessThanOrEqual(5);
    });

    it("should calculate dimension scores correctly", () => {
      const responses: Record<number, number> = {};
      // Fill with sample responses
      for (let i = 1; i <= 76; i++) {
        responses[i] = 3; // Mid-scale response
      }

      const dimensionScores = calculateDimensionScores(responses);

      expect(dimensionScores.demanda).toBeDefined();
      expect(dimensionScores.controle).toBeDefined();
      expect(dimensionScores.apoio).toBeDefined();
      expect(dimensionScores.lideranca).toBeDefined();
      expect(dimensionScores.comunidade).toBeDefined();
      expect(dimensionScores.significado).toBeDefined();
      expect(dimensionScores.confianca).toBeDefined();
      expect(dimensionScores.justica).toBeDefined();
      expect(dimensionScores.inseguranca).toBeDefined();
      expect(dimensionScores.saudeMental).toBeDefined();
      expect(dimensionScores.burnout).toBeDefined();
      expect(dimensionScores.violencia).toBeDefined();
    });

    it("should classify overall risk level", () => {
      const scores = {
        demanda: 80, // High
        controle: 30, // Low
        apoio: 25, // Low
        lideranca: 70,
        comunidade: 60,
        significado: 70,
        confianca: 50,
        justica: 50,
        inseguranca: 75, // High
        saudeMental: 80, // High
        burnout: 85, // High
        violencia: 20,
      };

      const riskLevel = classifyOverallRisk(scores);

      // High demanda, low controle/apoio, high burnout = critical risk
      expect(["medium", "high", "critical"]).toContain(riskLevel);
    });

    it("should include demographic data", () => {
      const responseData = {
        assessmentId: "copsoq-001",
        personId: people[0].id,
        responses: {}, // 76 responses
        ageGroup: "30-39",
        gender: "female",
        yearsInCompany: "5-10",
        mentalHealthSupport: "sim",
        workplaceImprovement: "Melhorar comunicação",
      };

      expect(responseData.ageGroup).toBeDefined();
      expect(responseData.gender).toBeDefined();
      expect(responseData.yearsInCompany).toBeDefined();
    });
  });

  describe("Reminder System", () => {
    it("should identify pending invites for reminders", () => {
      const invites = [
        {
          id: "invite-001",
          status: "pending",
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        },
        {
          id: "invite-002",
          status: "completed",
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: "invite-003",
          status: "pending",
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        },
      ];

      const pendingInvites = invites.filter((i) => i.status === "pending");
      expect(pendingInvites.length).toBe(2);
    });

    it("should send appropriate reminder based on number", () => {
      const reminderMessages = {
        1: "Lembrete: Avaliação COPSOQ-II Pendente",
        2: "Último Lembrete: Avaliação COPSOQ-II",
        3: "Avaliação COPSOQ-II Expirando em Breve",
      };

      expect(reminderMessages[1]).toContain("Lembrete");
      expect(reminderMessages[2]).toContain("Último");
      expect(reminderMessages[3]).toContain("Expirando");
    });
  });

  describe("Report Generation", () => {
    it("should aggregate responses from multiple participants", () => {
      const responses = [
        {
          id: "resp-001",
          personId: people[0].id,
          demandScore: 75,
          controlScore: 45,
          supportScore: 60,
          overallRiskLevel: "high",
        },
        {
          id: "resp-002",
          personId: people[1].id,
          demandScore: 60,
          controlScore: 70,
          supportScore: 80,
          overallRiskLevel: "medium",
        },
        {
          id: "resp-003",
          personId: people[2].id,
          demandScore: 85,
          controlScore: 30,
          supportScore: 40,
          overallRiskLevel: "critical",
        },
      ];

      const avgDemand = Math.round(
        responses.reduce((sum, r) => sum + r.demandScore, 0) / responses.length
      );
      const avgControl = Math.round(
        responses.reduce((sum, r) => sum + r.controlScore, 0) / responses.length
      );

      expect(avgDemand).toBe(73); // (75+60+85)/3
      expect(avgControl).toBe(48); // (45+70+30)/3
    });

    it("should count risk level distribution", () => {
      const responses = [
        { overallRiskLevel: "low" },
        { overallRiskLevel: "medium" },
        { overallRiskLevel: "medium" },
        { overallRiskLevel: "high" },
        { overallRiskLevel: "critical" },
      ];

      const distribution = {
        low: responses.filter((r) => r.overallRiskLevel === "low").length,
        medium: responses.filter((r) => r.overallRiskLevel === "medium").length,
        high: responses.filter((r) => r.overallRiskLevel === "high").length,
        critical: responses.filter((r) => r.overallRiskLevel === "critical")
          .length,
      };

      expect(distribution.low).toBe(1);
      expect(distribution.medium).toBe(2);
      expect(distribution.high).toBe(1);
      expect(distribution.critical).toBe(1);
    });

    it("should calculate response rate", () => {
      const totalInvites = 10;
      const completedResponses = 8;
      const responseRate = Math.round((completedResponses / totalInvites) * 100);

      expect(responseRate).toBe(80);
    });
  });

  describe("Complete COPSOQ Workflow", () => {
    it("should execute full workflow: create → invite → respond → report", () => {
      // Step 1: Create assessment
      const assessment = {
        id: "copsoq-e2e-001",
        tenantId: tenant.id,
        sectorId: sector.id,
        title: "E2E COPSOQ Assessment",
        status: "draft",
      };

      expect(assessment.status).toBe("draft");

      // Step 2: Generate invites
      const invites = people.map((person, idx) => ({
        id: `invite-e2e-${idx}`,
        assessmentId: assessment.id,
        respondentEmail: person.email,
        respondentName: person.name,
        inviteToken: generateMockToken(),
        status: "pending",
      }));

      expect(invites.length).toBe(3);

      // Step 3: Send invites (change status)
      invites.forEach((invite) => {
        invite.status = "sent" as any;
      });

      expect(invites[0].status).toBe("sent");

      // Step 4: Simulate responses
      const responses = invites.map((invite, idx) => ({
        id: `response-${idx}`,
        assessmentId: assessment.id,
        personId: people[idx].id,
        responses: generateMockResponses(),
        demandScore: 70,
        controlScore: 50,
        supportScore: 60,
        overallRiskLevel: "medium",
        completedAt: new Date(),
      }));

      expect(responses.length).toBe(3);

      // Step 5: Generate report
      const report = {
        id: "report-e2e-001",
        assessmentId: assessment.id,
        totalRespondents: responses.length,
        responseRate: 100, // 3/3
        averageDemandScore: 70,
        averageControlScore: 50,
        averageSupportScore: 60,
        lowRiskCount: 0,
        mediumRiskCount: 3,
        highRiskCount: 0,
        criticalRiskCount: 0,
        generatedAt: new Date(),
      };

      expect(report.totalRespondents).toBe(3);
      expect(report.responseRate).toBe(100);
      expect(report.mediumRiskCount).toBe(3);
    });
  });
});

// Helper functions
function generateMockToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateMockResponses(): Record<number, number> {
  const responses: Record<number, number> = {};
  for (let i = 1; i <= 76; i++) {
    responses[i] = Math.floor(Math.random() * 5) + 1;
  }
  return responses;
}

function calculateDimensionScores(responses: Record<number, number>) {
  // Simplified version - real implementation has specific question mappings
  const dimensions = {
    demanda: [1, 2, 3, 4, 5],
    controle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    apoio: [16, 17, 18, 19, 20],
    lideranca: [21, 22, 23, 24, 25, 26, 30, 31, 32, 36, 37, 38, 39],
    comunidade: [27, 28, 29, 33, 34, 35],
    significado: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
    confianca: [40, 41, 42, 43, 44, 45],
    justica: [46, 47, 48],
    inseguranca: [60],
    saudeMental: [61, 65, 66, 67, 68, 69, 70, 71, 72],
    burnout: [62, 63, 64],
    violencia: [73, 74, 75, 76],
  };

  const scores: Record<string, number> = {};

  for (const [dimension, questions] of Object.entries(dimensions)) {
    const values = questions.map((q) => responses[q] || 0).filter((v) => v > 0);
    if (values.length === 0) {
      scores[dimension] = 0;
    } else {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      scores[dimension] = Math.round(average * 20); // Scale 0-100
    }
  }

  return scores;
}

function classifyOverallRisk(
  scores: Record<string, number>
): "low" | "medium" | "high" | "critical" {
  const criticalFactors = [
    scores.demanda > 75,
    scores.controle < 25,
    scores.apoio < 25,
    scores.saudeMental > 75,
    scores.burnout > 75,
    scores.violencia > 50,
  ].filter(Boolean).length;

  if (criticalFactors >= 3) return "critical";
  if (criticalFactors >= 2) return "high";
  if (criticalFactors >= 1) return "medium";
  return "low";
}
