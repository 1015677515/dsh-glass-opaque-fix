/**
 * dsh-glass-opaque-fix — Host half.
 *
 * Does nothing on purpose. It exists because every plugin installed in this profile
 * ships a host row: the profile's `bundles` list is what the Loader walks, and no
 * plugin here declares `dsh.client` without `dsh.bundle` (checked across all 11
 * installed plugins). Following the proven shape rather than gambling on an
 * unverified one costs one trivial file.
 *
 * The actual work — injecting one CSS rule — belongs to the browser half, which
 * `dsh.client` makes the Loader load on its own.
 */

/** Row name; matches the `name` in cordis.patch.yml, the way the other plugins do. */
export const name = 'dsh-glass-opaque-fix';

/**
 * Nothing to set up.
 *
 * The parameters are declared even though neither is used: every other host half in
 * this profile takes `(ctx, config)`, and a zero-argument body is the kind of shape
 * difference a loader is entitled to reject. Declaring them costs nothing and keeps
 * this row indistinguishable from the ones known to load.
 *
 * Deliberately not omitted entirely — a row exporting no `apply` is not a shape any
 * installed plugin uses, and DSH treats a load-time throw as fatal.
 */
export function apply(_ctx, _config) {}
