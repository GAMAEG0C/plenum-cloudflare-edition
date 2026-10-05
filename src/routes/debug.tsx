import { createFileRoute } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-start'
import { getDebugInfo } from '@/server/debug.actions'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/debug')({
  component: DebugComponent,
})

function DebugComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['debug'],
    queryFn: async () => await getDebugInfo()
  })

  return (
    <div className="p-4 bg-white m-4 rounded shadow text-left overflow-auto">
      <h1 className="text-xl font-bold mb-4">Debug Info</h1>
      {isLoading && <p>Cargando...</p>}
      {error && <p className="text-red-500">{String(error)}</p>}
      {data && (
        <pre className="bg-gray-100 p-2 text-sm rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
