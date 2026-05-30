import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul className="p-8 space-y-2 list-disc max-w-md mx-auto my-10 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">Supabase Todos Checklist</h1>
      {todos && todos.length > 0 ? (
        todos.map((todo) => (
          <li key={todo.id} className="text-gray-800 font-medium">
            {todo.name}
          </li>
        ))
      ) : (
        <p className="text-gray-500 italic">No todos found or table &apos;todos&apos; is empty.</p>
      )}
    </ul>
  )
}
