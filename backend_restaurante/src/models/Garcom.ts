export const STATUS_GARCOM = ['ativo', 'de ferias', 'demitido'] as const
export type StatusGarcom = (typeof STATUS_GARCOM)[number]

export class Garcom {
  constructor(
    public id: string,
    public codigo: string,
    public cpf: string, // só dígitos
    public nome: string,
    public dataAdmissao: string, // 'AAAA-MM-DD'
    public comissao: number, // percentual
    public status: StatusGarcom,
  ) {}
}