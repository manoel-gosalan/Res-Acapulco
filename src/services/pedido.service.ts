import { supabase } from '@/lib/supabase'
import type { Pedido } from '@/types/pedido'

export async function getPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .in('status', ['pending', 'accepted', 'preparing'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function updatePedido(id: string, payload: Partial<Pedido>) {
  const { error } = await supabase
    .from('pedidos')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}
