/**
 * Progress of the list a page or form loads from the backend: still loading, loaded, or the request
 * failed (the error toast has already shown why).
 */
export type LoadState = 'loading' | 'loaded' | 'failed';
