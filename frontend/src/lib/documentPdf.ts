import { api } from "@/lib/api";

/** Fetches the rendered PDF through the API client (so auth headers are sent)
 *  and saves it, rather than linking straight at the endpoint. */
export async function downloadDocumentPdf(apiPath: string, id: number, number: string) {
  const res = await api.get(`/${apiPath}/${id}/pdf?download=true`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${number}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
