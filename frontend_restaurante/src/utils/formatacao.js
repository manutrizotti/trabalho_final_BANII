export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')

export function formatarTelefone(valor) {
  const d = soDigitos(valor).slice(0, 11)
  if (d.length <= 2) return d
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (d.length <= 6) return `(${ddd}) ${resto}`
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
}

export function formatarCpf(valor) {
  const d = soDigitos(valor).slice(0, 11)
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)]
  let s = p[0]
  if (p[1]) s += `.${p[1]}`
  if (p[2]) s += `.${p[2]}`
  if (p[3]) s += `-${p[3]}`
  return s
}

export function telefoneValido(valor) {
  const d = soDigitos(valor)
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11
}

export function cpfValido(valor) {
  const d = soDigitos(valor)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  for (const t of [9, 10]) {
    let soma = 0
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i)
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false
  }
  return true
}

export function formatarData(iso) {
  const [a, m, d] = String(iso ?? '').split('-')
  return a && m && d ? `${d}/${m}/${a}` : ''
}