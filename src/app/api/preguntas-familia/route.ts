import { NextRequest, NextResponse } from "next/server";
import { createPreguntaFamilia, getUsuario, listPreguntasFamilia } from "@/lib/db";
import {
  AuthError,
  requireAbueloOFamiliar,
  requireFamiliarConAbuelo,
} from "@/lib/auth/server";

const MAX_PENDIENTES = 20;
const MIN_LARGO = 3;
const MAX_LARGO = 300;

// La familia ve todas (para saber cuáles ya se respondieron); la persona
// mayor solo recibe las pendientes — lo que Griyo le va a mostrar.
export async function GET(req: NextRequest) {
  try {
    const { abueloId, rol } = await requireAbueloOFamiliar(req);
    const todas = await listPreguntasFamilia(abueloId);
    const preguntas = rol === "abuelo" ? todas.filter((p) => p.estado === "pendiente") : todas;
    return NextResponse.json({ preguntas });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preguntas-familia GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Solo la familia arma preguntas.
export async function POST(req: NextRequest) {
  try {
    const { abueloId, usuarioId } = await requireFamiliarConAbuelo(req);

    const body = await req.json().catch(() => ({}));
    const texto = typeof body.texto === "string" ? body.texto.trim() : "";
    if (texto.length < MIN_LARGO || texto.length > MAX_LARGO) {
      return NextResponse.json(
        { error: `La pregunta debe tener entre ${MIN_LARGO} y ${MAX_LARGO} caracteres.` },
        { status: 400 }
      );
    }

    const existentes = await listPreguntasFamilia(abueloId);
    if (existentes.filter((p) => p.estado === "pendiente").length >= MAX_PENDIENTES) {
      return NextResponse.json(
        { error: `Ya hay ${MAX_PENDIENTES} preguntas esperando respuesta. Espera a que respondan algunas.` },
        { status: 409 }
      );
    }

    const autor = await getUsuario(usuarioId);
    const pregunta = await createPreguntaFamilia({
      abuelo_id: abueloId,
      texto,
      autor_nombre: autor?.nombre ?? "Tu familia",
      creada_por: usuarioId,
    });
    return NextResponse.json({ pregunta }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preguntas-familia POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
