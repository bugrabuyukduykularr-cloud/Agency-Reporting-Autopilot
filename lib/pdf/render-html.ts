/* eslint-disable @typescript-eslint/no-require-imports */
import type { ReportTemplateProps } from "@/components/pdf/report-template";

/**
 * Renders the report template to a full HTML document string.
 *
 * Uses dynamic require() to bypass Next.js webpack restriction that blocks
 * static `import … from "react-dom/server"` in route handler import chains.
 */
export function renderReportHtml(props: ReportTemplateProps): string {
  // Dynamic requires — invisible to Next.js static analysis
  const ReactDOMServer = require("react-dom/server") as {
    renderToStaticMarkup: (element: React.ReactElement) => string;
  };
  const React = require("react") as typeof import("react");
  const { ReportTemplate } = require("@/components/pdf/report-template") as {
    ReportTemplate: React.FC<ReportTemplateProps>;
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ReportTemplate, props)
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 794px; background: white; }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>${html}</body>
</html>`;
}
