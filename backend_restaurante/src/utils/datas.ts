const pad = (n: number) => String(n).padStart(2, '0')

/** Date -> 'AAAA-MM-DD HH:mm:ss' */
export function formatarDataHora(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 'AAAA-MM-DD HH:mm:ss' -> Date */
export function paraData(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}