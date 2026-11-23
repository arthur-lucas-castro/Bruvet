import type { FieldValues, Path, UseFormRegister } from 'react-hook-form'

/** `register` do react-hook-form aplicando uma máscara enquanto a pessoa digita. */
export function maskedRegister<T extends FieldValues>(
  register: UseFormRegister<T>,
  name: Path<T>,
  mask: (value: string) => string,
) {
  const registration = register(name)
  return {
    ...registration,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value = mask(event.target.value)
      return registration.onChange(event)
    },
  }
}
