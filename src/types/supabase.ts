export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cita: {
        Row: {
          especialidad: string
          fecha_hora: string
          id_cita: string
          id_perfil: string
          lugar: string
          medico: string
          motivo: string
        }
        Insert: {
          especialidad?: string
          fecha_hora: string
          id_cita: string
          id_perfil?: string
          lugar?: string
          medico?: string
          motivo?: string
        }
        Update: {
          especialidad?: string
          fecha_hora?: string
          id_cita?: string
          id_perfil?: string
          lugar?: string
          medico?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cita_id_perfil_fkey"
            columns: ["id_perfil"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id_perfil"]
          },
        ]
      }
      condicion: {
        Row: {
          codigo: string
          id_perfil: string
          orden: number
        }
        Insert: {
          codigo: string
          id_perfil?: string
          orden?: number
        }
        Update: {
          codigo?: string
          id_perfil?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "condicion_id_perfil_fkey"
            columns: ["id_perfil"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id_perfil"]
          },
        ]
      }
      horario: {
        Row: {
          hora: string
          id_medicamento: string
          id_perfil: string
          orden: number
        }
        Insert: {
          hora: string
          id_medicamento: string
          id_perfil?: string
          orden?: number
        }
        Update: {
          hora?: string
          id_medicamento?: string
          id_perfil?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "horario_id_perfil_id_medicamento_fkey"
            columns: ["id_perfil", "id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamento"
            referencedColumns: ["id_perfil", "id_medicamento"]
          },
        ]
      }
      medicamento: {
        Row: {
          activo: boolean
          creado_en: string
          dosis: string
          id_medicamento: string
          id_perfil: string
          instruccion: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          creado_en: string
          dosis?: string
          id_medicamento: string
          id_perfil?: string
          instruccion?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          dosis?: string
          id_medicamento?: string
          id_perfil?: string
          instruccion?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamento_id_perfil_fkey"
            columns: ["id_perfil"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id_perfil"]
          },
        ]
      }
      medicion: {
        Row: {
          contexto: string | null
          diastolica: number | null
          fecha_hora: string
          glucosa: number | null
          id_medicion: string
          id_perfil: string
          nota: string
          peso: number | null
          pulso: number | null
          sistolica: number | null
          tipo: string
        }
        Insert: {
          contexto?: string | null
          diastolica?: number | null
          fecha_hora: string
          glucosa?: number | null
          id_medicion: string
          id_perfil?: string
          nota?: string
          peso?: number | null
          pulso?: number | null
          sistolica?: number | null
          tipo: string
        }
        Update: {
          contexto?: string | null
          diastolica?: number | null
          fecha_hora?: string
          glucosa?: number | null
          id_medicion?: string
          id_perfil?: string
          nota?: string
          peso?: number | null
          pulso?: number | null
          sistolica?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicion_id_perfil_fkey"
            columns: ["id_perfil"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id_perfil"]
          },
        ]
      }
      perfil: {
        Row: {
          contacto_nombre: string | null
          contacto_telefono: string | null
          datos_demo: boolean
          fecha_nacimiento: string | null
          id_perfil: string
          nombre: string
          version_esquema: number
        }
        Insert: {
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          datos_demo?: boolean
          fecha_nacimiento?: string | null
          id_perfil?: string
          nombre: string
          version_esquema?: number
        }
        Update: {
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          datos_demo?: boolean
          fecha_nacimiento?: string | null
          id_perfil?: string
          nombre?: string
          version_esquema?: number
        }
        Relationships: []
      }
      preferencias: {
        Row: {
          alto_contraste: boolean
          escala_texto: string
          id_perfil: string
          modo_simple: boolean
        }
        Insert: {
          alto_contraste?: boolean
          escala_texto?: string
          id_perfil?: string
          modo_simple?: boolean
        }
        Update: {
          alto_contraste?: boolean
          escala_texto?: string
          id_perfil?: string
          modo_simple?: boolean
        }
        Relationships: []
      }
      rangos_objetivo: {
        Row: {
          ayunas_max: number | null
          ayunas_min: number | null
          dia_max: number | null
          dia_min: number | null
          id_perfil: string
          peso_max: number | null
          peso_min: number | null
          post_max: number | null
          post_min: number | null
          sis_max: number | null
          sis_min: number | null
        }
        Insert: {
          ayunas_max?: number | null
          ayunas_min?: number | null
          dia_max?: number | null
          dia_min?: number | null
          id_perfil: string
          peso_max?: number | null
          peso_min?: number | null
          post_max?: number | null
          post_min?: number | null
          sis_max?: number | null
          sis_min?: number | null
        }
        Update: {
          ayunas_max?: number | null
          ayunas_min?: number | null
          dia_max?: number | null
          dia_min?: number | null
          id_perfil?: string
          peso_max?: number | null
          peso_min?: number | null
          post_max?: number | null
          post_min?: number | null
          sis_max?: number | null
          sis_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rangos_objetivo_id_perfil_fkey"
            columns: ["id_perfil"]
            isOneToOne: true
            referencedRelation: "perfil"
            referencedColumns: ["id_perfil"]
          },
        ]
      }
      registro_dosis: {
        Row: {
          estado: string
          fecha_hora_programada: string
          id_medicamento: string
          id_perfil: string
          id_registro: string
          registrado_en: string | null
        }
        Insert: {
          estado: string
          fecha_hora_programada: string
          id_medicamento: string
          id_perfil?: string
          id_registro: string
          registrado_en?: string | null
        }
        Update: {
          estado?: string
          fecha_hora_programada?: string
          id_medicamento?: string
          id_perfil?: string
          id_registro?: string
          registrado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_dosis_id_perfil_id_medicamento_fkey"
            columns: ["id_perfil", "id_medicamento"]
            isOneToOne: false
            referencedRelation: "medicamento"
            referencedColumns: ["id_perfil", "id_medicamento"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      eliminar_mi_cuenta: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
