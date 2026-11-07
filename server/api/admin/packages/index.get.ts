/** Admin: all packages (archived ones excluded) with usage numbers. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { packages: await listPackages() }
})
