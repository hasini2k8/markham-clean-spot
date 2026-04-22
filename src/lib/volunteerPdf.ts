import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface VolunteerFormData {
  studentName: string;
  studentSchool?: string | null;
  supervisorName: string;
  supervisorEmail?: string | null;
  hours: number;
  activityDescription: string;
  startDate?: string | null;
  endDate?: string | null;
  signatureName?: string | null;
  signedAt?: string | null;
}

const M = 50;

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildVolunteerFormPdf(data: VolunteerFormData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  let y = height - M;

  // Header
  page.drawText("MaVo — Volunteer Hours Form", {
    x: M, y, size: 18, font: bold, color: rgb(0.1, 0.35, 0.15),
  });
  y -= 26;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 24;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: M, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value || "—", { x: M + 140, y, size: 11, font });
    y -= 22;
  };

  row("Student name:", data.studentName);
  row("School / Org:", data.studentSchool || "—");
  row("Supervisor name:", data.supervisorName);
  row("Supervisor email:", data.supervisorEmail || "—");
  row("Total hours:", String(data.hours));
  row("Date range:", `${data.startDate || "—"}  to  ${data.endDate || "—"}`);

  y -= 6;
  page.drawText("Activity description:", { x: M, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
  y -= 16;
  const lines = wrap(data.activityDescription || "—", font, 11, width - M * 2);
  for (const ln of lines) {
    page.drawText(ln, { x: M, y, size: 11, font });
    y -= 15;
  }

  // Signature box
  y = 240;
  page.drawLine({ start: { x: M, y: y + 10 }, end: { x: width - M, y: y + 10 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  page.drawText("Supervisor verification", { x: M, y: y - 10, size: 12, font: bold });
  y -= 36;
  page.drawText("I confirm the volunteer hours stated above are accurate.", { x: M, y, size: 10, font });
  y -= 36;

  page.drawText("Signed by:", { x: M, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
  if (data.signatureName) {
    page.drawText(data.signatureName, { x: M + 80, y, size: 16, font: bold, color: rgb(0.05, 0.3, 0.5) });
  } else {
    page.drawLine({ start: { x: M + 80, y: y - 2 }, end: { x: width - M, y: y - 2 }, thickness: 0.5 });
  }
  y -= 24;
  page.drawText("Date:", { x: M, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
  if (data.signedAt) {
    page.drawText(new Date(data.signedAt).toLocaleString(), { x: M + 80, y, size: 11, font });
  } else {
    page.drawLine({ start: { x: M + 80, y: y - 2 }, end: { x: width - M, y: y - 2 }, thickness: 0.5 });
  }

  page.drawText(
    data.signatureName
      ? "✓ Digitally signed via MaVo app"
      : "Awaiting supervisor signature",
    { x: M, y: 60, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
  );

  return pdf.save();
}
