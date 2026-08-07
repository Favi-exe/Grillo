"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}

export function PasswordInput({ value, onChange, placeholder, required }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[52px] w-full border-2 border-sand-400 rounded-2xl pl-4 pr-14 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-sand-500 hover:text-sand-700"
      >
        {visible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}
