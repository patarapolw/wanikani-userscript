// https://nodejs.org/api/esm.html#esm_code_resolve_code_hook

/**
 * @param {string} url
 * @param {object} context (currently empty)
 * @param {function} defaultGetFormat
 * @returns {object} response
 * @returns {string} response.format
 */
export async function getFormat(url, context, defaultGetFormat) {
  if (url.endsWith('ts') || url.endsWith('tsx')) {
    // For some or all URLs, do some custom logic for determining format.
    // Always return an object of the form {format: <string>}, where the
    // format is one of the strings in the table above.
    return {
      format: 'module'
    }
  }
  // Defer to Node.js for all other URLs.
  return defaultGetFormat(url, context, defaultGetFormat)
}

/**
 * @param {string} specifier
 * @param {object} context
 * @param {string} context.parentURL
 * @param {function} defaultResolve
 * @returns {object} response
 * @returns {string} response.url
 */
export async function resolve(specifier, context, defaultResolve) {
  if (
    context.parentURL &&
    (context.parentURL.endsWith('ts') || context.parentURL.endsWith('tsx'))
  ) {
    return defaultResolve(specifier + '.ts', context, defaultResolve)
  }
  // Defer to Node.js for all other specifiers.
  return defaultResolve(specifier, context, defaultResolve)
}
