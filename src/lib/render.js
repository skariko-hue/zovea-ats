export function renderError(res, req, err) {
  const message =
    err?.publicMessage ||
    err?.message ||
    'Er is iets misgegaan. Probeer het opnieuw of neem contact op met de beheerder.';
  return res.render('pages/error', { req, message, err });
}

