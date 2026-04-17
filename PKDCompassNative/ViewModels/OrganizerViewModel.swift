import Foundation
import SwiftData

@MainActor
final class OrganizerViewModel: ObservableObject {
    @Published var appointments: [AppointmentItem] = []
    @Published var tasks: [CareTaskItem] = []
    @Published var errorMessage: String?

    @Published var appointmentTitle = ""
    @Published var appointmentType = "Nephrology"
    @Published var provider = ""
    @Published var location = ""
    @Published var appointmentDate = Date()
    @Published var appointmentNotes = ""

    @Published var taskTitle = ""
    @Published var taskDueDate = Date()
    @Published var setTaskDue = false

    func load(context: ModelContext) {
        do {
            appointments = try OrganizerRepository.appointments(context: context)
            tasks = try OrganizerRepository.tasks(context: context)
        } catch {
            errorMessage = "Failed to load organizer data"
        }
    }

    func addAppointment(context: ModelContext, notificationService: NotificationScheduling) async {
        guard !appointmentTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Appointment title is required"
            return
        }

        do {
            let appointment = try OrganizerRepository.addAppointment(
                context: context,
                title: appointmentTitle,
                provider: provider.isEmpty ? appointmentType : provider,
                location: location,
                date: appointmentDate,
                notes: appointmentNotes
            )

            if appointment.date > Date() {
                let granted = await notificationService.requestPermission()
                if granted {
                    try await notificationService.scheduleOneHourAndAtTime(
                        idPrefix: "appt.\(appointment.id.uuidString)",
                        title: "Appointment Reminder",
                        body: "\(appointment.title) at \(appointment.date.formatted(date: .omitted, time: .shortened))",
                        date: appointment.date
                    )
                }
            }

            appointmentTitle = ""
            appointmentType = "Nephrology"
            provider = ""
            location = ""
            appointmentNotes = ""
            load(context: context)
        } catch {
            errorMessage = "Failed to save appointment"
        }
    }

    func addTask(context: ModelContext, notificationService: NotificationScheduling) async {
        guard !taskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Task title is required"
            return
        }

        do {
            let task = try OrganizerRepository.addTask(context: context, title: taskTitle, dueAt: setTaskDue ? taskDueDate : nil)
            if let dueAt = task.dueAt, dueAt > Date() {
                let granted = await notificationService.requestPermission()
                if granted {
                    try await notificationService.scheduleOneHourAndAtTime(
                        idPrefix: "task.\(task.id.uuidString)",
                        title: "Care Task Reminder",
                        body: task.title,
                        date: dueAt
                    )
                }
            }

            taskTitle = ""
            setTaskDue = false
            load(context: context)
        } catch {
            errorMessage = "Failed to save task"
        }
    }

    func toggleTask(context: ModelContext, task: CareTaskItem) {
        do {
            try OrganizerRepository.toggleTask(context: context, task: task)
            load(context: context)
        } catch {
            errorMessage = "Failed to update task"
        }
    }

    func deleteAppointment(context: ModelContext, appointment: AppointmentItem) {
        do {
            try OrganizerRepository.deleteAppointment(context: context, appointment: appointment)
            load(context: context)
        } catch {
            errorMessage = "Failed to delete appointment"
        }
    }

    func deleteTask(context: ModelContext, task: CareTaskItem) {
        do {
            try OrganizerRepository.deleteTask(context: context, task: task)
            load(context: context)
        } catch {
            errorMessage = "Failed to delete task"
        }
    }
}
