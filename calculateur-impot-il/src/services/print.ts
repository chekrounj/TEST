/**
 * Service d'impression — déclenche l'impression du navigateur.
 *
 * La mise en page d'impression est gérée en CSS (media print). Pour une
 * génération PDF en pièce jointe (Graph API), brancher jsPDF/html2pdf ici.
 */
export function printReport(): void {
  window.print();
}
