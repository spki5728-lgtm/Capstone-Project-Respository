// Deletes everything Flipcast stores about one upload: sales, metrics, listing counts, AI report and the seller's feedback.
import { deleteFeedback } from "./feedback";
import { deleteReport } from "./report";
import { deleteUploadFiles, type Upload } from "./storage";

export async function deleteUploadEverywhere(upload: Upload) {
  await Promise.all([deleteReport(upload.id), deleteFeedback(upload.id)]);
  await deleteUploadFiles(upload);
}
