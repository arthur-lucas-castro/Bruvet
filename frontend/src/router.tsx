import { createBrowserRouter } from 'react-router'
import { AppLayout, type RouteHandle } from './components/layout/AppLayout'
import { RequireAuth, RequireRole } from './features/auth/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'

const handle = (title: string): RouteHandle => ({ title })

// As telas dos módulos são carregadas sob demanda, para a abertura do sistema ficar leve.
const patients = () => import('./features/patients/pages')
const tutors = () => import('./features/tutors/pages')
const stock = () => import('./features/stock/pages')
const attendances = () => import('./features/attendances/pages')

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('./features/auth/LoginPage')).LoginPage }),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: handle('Painel') },

          // ---------- Pacientes ----------
          {
            path: 'pacientes',
            handle: handle('Pacientes'),
            lazy: async () => ({ Component: (await patients()).PatientsPage }),
          },
          {
            path: 'pacientes/novo',
            handle: handle('Pacientes'),
            lazy: async () => ({ Component: (await patients()).PatientFormPage }),
          },
          {
            path: 'pacientes/:id',
            handle: handle('Paciente'),
            lazy: async () => ({ Component: (await patients()).PatientDetailPage }),
          },
          {
            path: 'pacientes/:id/historico',
            handle: handle('Histórico do paciente'),
            lazy: async () => ({ Component: (await patients()).PatientHistoryPage }),
          },
          {
            path: 'pacientes/:id/editar',
            handle: handle('Paciente'),
            lazy: async () => ({ Component: (await patients()).PatientFormPage }),
          },

          // ---------- Tutores ----------
          {
            path: 'tutores',
            handle: handle('Tutores'),
            lazy: async () => ({ Component: (await tutors()).TutorsPage }),
          },
          {
            path: 'tutores/novo',
            handle: handle('Tutores'),
            lazy: async () => ({ Component: (await tutors()).TutorFormPage }),
          },
          {
            path: 'tutores/:id',
            handle: handle('Tutor'),
            lazy: async () => ({ Component: (await tutors()).TutorDetailPage }),
          },
          {
            path: 'tutores/:id/editar',
            handle: handle('Tutor'),
            lazy: async () => ({ Component: (await tutors()).TutorFormPage }),
          },

          // ---------- Catálogo de procedimentos ----------
          {
            path: 'procedimentos',
            handle: handle('Procedimentos'),
            lazy: async () => ({
              Component: (await import('./features/procedures/ProceduresPage')).ProceduresPage,
            }),
          },

          // ---------- Estoque ----------
          {
            path: 'estoque',
            handle: handle('Estoque'),
            lazy: async () => ({ Component: (await stock()).StockPage }),
          },
          {
            path: 'estoque/:id',
            handle: handle('Estoque'),
            lazy: async () => ({ Component: (await stock()).MedicationDetailPage }),
          },

          // ---------- Atendimentos ----------
          {
            path: 'atendimentos',
            handle: handle('Atendimentos'),
            lazy: async () => ({ Component: (await attendances()).AttendancesPage }),
          },
          {
            path: 'atendimentos/novo',
            handle: handle('Atendimentos'),
            lazy: async () => ({ Component: (await attendances()).NewAttendancePage }),
          },
          {
            path: 'atendimentos/:id',
            handle: handle('Atendimento'),
            lazy: async () => ({ Component: (await attendances()).AttendancePage }),
          },

          // ---------- Conta e administração ----------
          {
            path: 'usuarios',
            handle: handle('Usuários'),
            lazy: async () => {
              const { UsersPage } = await import('./features/users/UsersPage')
              return {
                element: (
                  <RequireRole roles={['admin']}>
                    <UsersPage />
                  </RequireRole>
                ),
              }
            },
          },
          {
            path: 'trocar-senha',
            handle: handle('Trocar senha'),
            lazy: async () => ({
              Component: (await import('./features/auth/ChangePasswordPage')).ChangePasswordPage,
            }),
          },
          { path: '*', element: <NotFoundPage />, handle: handle('Página não encontrada') },
        ],
      },
    ],
  },
])
