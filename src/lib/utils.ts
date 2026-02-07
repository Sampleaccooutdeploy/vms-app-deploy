/**
 * Utility function for merging CSS class names.
 * Filters out falsy values (undefined, null, false, "") and joins the rest.
 * Works with CSS Modules and plain class names.
 *
 * @example
 * cn(styles.card, isActive && styles.active, className)
 * // => "card_xyz active_xyz custom-class"
 */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
    return classes.filter(Boolean).join(" ");
}
