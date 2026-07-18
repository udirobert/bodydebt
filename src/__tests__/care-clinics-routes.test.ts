import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { POST as createClinic, GET as listClinics } from "@/app/api/care/clinics/route";
import { POST as enrollPatient } from "@/app/api/care/clinics/[id]/patients/route";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db/queries/care", () => ({
  createCareClinic: vi.fn(),
  createCareClinician: vi.fn(),
  getCareClinician: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getCarePatientByUserId: vi.fn(),
  createCarePatient: vi.fn(),
  updateCarePatient: vi.fn(),
  getClinicsForUser: vi.fn(),
  getPatientsForClinic: vi.fn(),
  getActiveCareAcknowledgement: vi.fn(),
  createCareInvitation: vi.fn(),
  revokeActiveCareInvitations: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import {
  createCareClinic,
  createCareClinician,
  getCareClinician,
  getUserByEmail,
  createUser,
  getCarePatientByUserId,
  createCarePatient,
  updateCarePatient,
  getClinicsForUser,
  getPatientsForClinic,
} from "@/lib/db/queries/care";

function mockAuth(userId = "user-1") {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    user: { id: userId, email: "clinician@example.com" },
  });
}

function mockGuest() {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "authentication required" }, { status: 401 }),
  });
}

describe("POST /api/care/clinics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({ name: "Demo Clinic" }),
    });
    const res = await createClinic(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await createClinic(req as never);
    expect(res.status).toBe(400);
  });

  it("creates a clinic and assigns the caller as admin", async () => {
    mockAuth("user-1");
    (createCareClinic as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clinic-1", name: "Demo Clinic" });
    (createCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1" });

    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({ name: "Demo Clinic" }),
    });
    const res = await createClinic(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.clinic.id).toBe("clinic-1");
    expect(createCareClinician).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", clinicId: "clinic-1", role: "admin" }),
    );
  });
});

describe("GET /api/care/clinics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns clinics and their patients for the authenticated clinician", async () => {
    mockAuth("clinician-1");
    (getClinicsForUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "clinic-1", name: "Demo Clinic", createdAt: new Date() },
    ]);
    (getPatientsForClinic as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "patient-1", userId: "user-2", clinicId: "clinic-1", medication: "Semaglutide", currentDose: "2.4mg weekly" },
    ]);

    const req = new Request("http://localhost:3000/api/care/clinics");
    const res = await listClinics(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.clinics).toHaveLength(1);
    expect(data.clinics[0].patients).toHaveLength(1);
    expect(data.clinics[0].patients[0].medication).toBe("Semaglutide");
  });
});

describe("POST /api/care/clinics/[id]/patients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not a clinician for the clinic", async () => {
    mockAuth();
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    expect(res.status).toBe(403);
  });

  it("creates a new user and enrolls them as a patient", async () => {
    mockAuth("clinician-1");
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "clinician-1", clinicId: "clinic-1" });
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", email: "patient@example.com" });
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createCarePatient as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-1" });

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com", name: "Jane Doe", medication: "Semaglutide", currentDose: "2.4mg weekly" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(createUser).toHaveBeenCalledWith({ email: "patient@example.com", name: "Jane Doe" });
    expect(createCarePatient).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-2", clinicId: "clinic-1", medication: "Semaglutide", currentDose: "2.4mg weekly" }),
    );
  });

  it("reuses an existing patient and updates their clinic and dose if needed", async () => {
    mockAuth("clinician-1");
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "clinician-1", clinicId: "clinic-1" });
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", email: "patient@example.com" });
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-2", medication: null, currentDose: null });
    (updateCarePatient as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-1", medication: "Semaglutide", currentDose: "2.4mg weekly" });

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com", medication: "Semaglutide", currentDose: "2.4mg weekly" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateCarePatient).toHaveBeenCalledWith("patient-1", {
      clinicId: "clinic-1",
      medication: "Semaglutide",
      currentDose: "2.4mg weekly",
    });
  });
});
