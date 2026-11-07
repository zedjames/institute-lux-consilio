// ILC's canonical Cloudflare Web Analytics beacon (public site token).
// Keep the script exactly once inside <head> on every published HTML page.
export const CLOUDFLARE_WEB_ANALYTICS_BEACON = "<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"6fdc2cfc4f64417ab581ef6118416378\"}'></script><!-- End Cloudflare Web Analytics -->";

export function ensureCloudflareAnalytics(html,page="HTML page"){
 const source="static.cloudflareinsights.com/beacon.min.js";
 if(html.includes(CLOUDFLARE_WEB_ANALYTICS_BEACON)){
  if(html.split(source).length!==2 || html.split(CLOUDFLARE_WEB_ANALYTICS_BEACON).length!==2)
   throw Error("Duplicate Cloudflare Web Analytics on "+page);
  return html;
 }
 if(html.includes(source))throw Error("Unexpected Cloudflare beacon variant on "+page);
 if(html.split("</head>").length!==2)throw Error("Expected one HTML head on "+page);
 return html.replace("</head>",CLOUDFLARE_WEB_ANALYTICS_BEACON+"</head>");
}
