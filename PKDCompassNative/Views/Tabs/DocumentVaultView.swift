import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct DocumentVaultView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = DocumentVaultViewModel()

    @State private var showingImporter = false
    @State private var selectedFileURL: URL?
    @State private var activeFilter = "All"
    @State private var selectedDoc: DocumentRecord?
    @State private var showingUpload = false
    @State private var tagsText = ""
    @State private var showingUploadConsent = false
    @State private var showingAnalysisConsent = false
    @State private var pendingAnalysisToggle = false

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    filterChips
                    if viewModel.documents.isEmpty {
                        emptyStateCard
                    } else {
                        documentsGrid
                    }
                }
                .padding()
                .padding(.bottom, 24)
            }
        }
        .pkdPageBackground()
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.backendURL = AppConfig.defaultBackendURL
            viewModel.load(context: modelContext)
        }
        .sheet(item: $selectedDoc) { doc in
            documentDetail(doc)
        }
        .sheet(isPresented: $showingUpload) {
            uploadSheet
        }
        .alert("Document Vault Consent", isPresented: $showingUploadConsent) {
            Button("Decline", role: .cancel) { }
            Button("Accept") {
                Task {
                    try? await authViewModel.updateConsents([(.documentUpload, true)])
                    showingUpload = true
                }
            }
        } message: {
            Text("Uploading a document sends the selected file from your device to PKD Compass backend services so it can be stored in your vault and synced across sessions. Uploads may fail, sync late, duplicate, or store incomplete metadata. PKD Compass is not liable for treatment decisions, delayed care, filing mistakes, or losses caused by relying on uploaded-document availability instead of your official records. If you decline, document uploads stay disabled.")
        }
        .alert("AI Analysis Consent", isPresented: $showingAnalysisConsent) {
            Button("Decline", role: .cancel) {
                pendingAnalysisToggle = false
                viewModel.wantsAIAnalysis = false
            }
            Button("Accept") {
                Task {
                    try? await authViewModel.updateConsents([(.documentAIAnalysis, true)])
                    viewModel.wantsAIAnalysis = pendingAnalysisToggle
                }
            }
        } message: {
            Text("If you enable analysis, PKD Compass will transmit extracted content from this uploaded document from its backend services to a third-party AI service to generate a consumer-friendly summary. OCR and AI analysis may misread names, units, values, dates, ranges, and context, and summaries may be incomplete, stale, or wrong. PKD Compass is not liable for clinical, treatment, medication, scheduling, or emergency decisions made from analysis output. This feature is optional and informational only. It is not medical advice, diagnosis, or treatment.")
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Document Vault")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text("Secure storage for your medical records.")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
            Button {
                if authViewModel.hasConsent(.documentUpload) {
                    showingUpload = true
                } else {
                    showingUploadConsent = true
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.arrow.up")
                    Text("Upload")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(PKDPalette.primary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .pkdGlassHeader()
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(["All"] + viewModel.categories, id: \.self) { category in
                    Button {
                        activeFilter = category
                    } label: {
                        Text(category)
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(activeFilter == category ? .white : PKDPalette.textMuted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(activeFilter == category ? PKDPalette.primary : Color.white)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(PKDPalette.primary.opacity(0.14), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var emptyStateCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "folder")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(PKDPalette.textMuted)
            Text("No documents found")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Text("Upload your first lab report or visit summary.")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(18)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                .foregroundStyle(PKDPalette.primary.opacity(0.2))
        )
    }

    private var documentsGrid: some View {
        let docs = filteredDocs

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Stored Documents")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Text("\(docs.count)")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            if docs.isEmpty {
                EmptyView()
            } else {
                LazyVGrid(
                    columns: horizontalSizeClass == .compact
                        ? [GridItem(.flexible())]
                        : [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: 10
                ) {
                    ForEach(docs, id: \.id) { doc in
                        documentCard(doc)
                    }
                }
            }
        }
    }

    private func documentCard(_ doc: DocumentRecord) -> some View {
        Button {
            selectedDoc = doc
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color(hex: "#F8FAFC"))
                    .frame(height: 92)
                    .overlay {
                        VStack(spacing: 4) {
                            Image(systemName: doc.mimeType.hasPrefix("image/") ? "photo" : "doc.richtext")
                                .font(.system(size: 26))
                                .foregroundStyle(PKDPalette.primary.opacity(0.65))
                        }
                    }

                Text(doc.title)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack {
                    Text(doc.category)
                    Spacer()
                    Text(doc.createdAt.formatted(date: .abbreviated, time: .omitted))
                }
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            }
            .pkdCard()
        }
        .buttonStyle(.plain)
    }

    private func documentDetail(_ doc: DocumentRecord) -> some View {
        DocumentDetailSheet(
            document: doc,
            initialDetail: viewModel.documentDetails[doc.id],
            onClose: { selectedDoc = nil },
            onDelete: {
                viewModel.delete(document: doc, context: modelContext)
                selectedDoc = nil
            }
        )
    }

    private var uploadSheet: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    uploadHeroCard

                    fieldCard {
                        field("Document Title", text: $viewModel.title, placeholder: "e.g., January Lab Results")
                    }

                    fieldCard {
                        Group {
                            if horizontalSizeClass == .compact {
                                VStack(spacing: 12) {
                                    categoryPicker
                                    documentDateField
                                }
                            } else {
                                HStack(spacing: 12) {
                                    categoryPicker
                                    documentDateField
                                }
                            }
                        }
                    }

                    fileUploadCard
                        .fileImporter(
                            isPresented: $showingImporter,
                            allowedContentTypes: [.pdf, .png, .jpeg, .heic, .image],
                            allowsMultipleSelection: false
                        ) { result in
                            switch result {
                            case .success(let urls):
                                selectedFileURL = urls.first
                            case .failure:
                                viewModel.message = "File selection failed"
                            }
                        }

                    disclosureCard(
                        title: "Storage & Sync Disclosure",
                        icon: "externaldrive.badge.icloud",
                        tint: PKDPalette.primary,
                        body: "When you save a file, PKD Compass uploads it from this device to backend storage so it can appear in your vault across sessions. Upload and sync may be delayed or fail. Only upload records you want stored in your account, and keep your own official copies outside PKD Compass."
                    )

                    fieldCard {
                        field("Tags (optional, comma separated)", text: $tagsText, placeholder: "e.g., PKD, High Potassium")
                    }

                    fieldCard {
                        Toggle(isOn: Binding(
                            get: { viewModel.wantsAIAnalysis },
                            set: { newValue in
                                pendingAnalysisToggle = newValue
                                if newValue && !authViewModel.hasConsent(.documentAIAnalysis) {
                                    showingAnalysisConsent = true
                                } else {
                                    viewModel.wantsAIAnalysis = newValue
                                }
                            }
                        )) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Analyze This Document")
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMain)
                                Text("Optional AI summary for consumer use. If enabled, extracted document content is processed by a third-party AI service. Informational only, not medical advice.")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        .tint(PKDPalette.primary)
                    }

                    disclosureCard(
                        title: "Medical Disclaimer",
                        icon: "cross.case.fill",
                        tint: PKDPalette.warning,
                        body: "This feature is for informational purposes only and does not provide medical advice, diagnosis, or treatment. Always review lab reports, uploaded values, and any summaries with your physician or other qualified healthcare provider before acting on them."
                    )

                    if let message = viewModel.message {
                        HStack(spacing: 10) {
                            Image(systemName: message.contains("failed") || message.contains("Please") ? "exclamationmark.triangle.fill" : "sparkles")
                                .foregroundStyle(message.contains("failed") || message.contains("Please") ? PKDPalette.warning : PKDPalette.primary)
                            Text(message)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                            Spacer()
                        }
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.white.opacity(0.94))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.1), lineWidth: 1)
                        )
                    }

                    Button(viewModel.isUploading ? "Uploading..." : "Save to Vault") {
                        guard let selectedFileURL else { return }
                        Task {
                            await viewModel.upload(fileURL: selectedFileURL, tags: tagsText, context: modelContext)
                            if viewModel.message == "Uploaded and analyzed" || viewModel.message == "Uploaded successfully" {
                                showingUpload = false
                                self.selectedFileURL = nil
                                tagsText = ""
                            }
                        }
                    }
                    .buttonStyle(PKDPrimaryButtonStyle())
                    .disabled(selectedFileURL == nil || viewModel.isUploading)
                }
                .padding()
                .padding(.bottom, 30)
            }
            .pkdPageBackground()
        }
    }

    private var uploadHeroCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Upload Document")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Add reports, scans, and visit notes for secure storage in your vault.")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.9))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Button {
                    showingUpload = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white.opacity(0.95))
                        .frame(width: 38, height: 38)
                        .background(Color.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 10) {
                uploadHeroMetric(
                    title: "Category",
                    value: viewModel.category
                )
                uploadHeroMetric(
                    title: "Date",
                    value: viewModel.documentDate.formatted(.dateTime.month(.abbreviated).day().year())
                )
            }

            HStack(spacing: 8) {
                Image(systemName: selectedFileURL == nil ? "shield.lefthalf.filled" : "checkmark.seal.fill")
                    .foregroundStyle(selectedFileURL == nil ? Color.white.opacity(0.92) : Color(hex: "#D1FAE5"))
                Text(selectedFileURL == nil ? "Ready for PDF or image upload" : "File selected and ready for vault save")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(PKDGradients.hero)
        )
        .shadow(color: PKDPalette.primary.opacity(0.28), radius: 22, x: 0, y: 12)
    }

    private func uploadHeroMetric(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .tracking(1.1)
                .foregroundStyle(Color.white.opacity(0.7))
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func fieldCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            content()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.96))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 14, x: 0, y: 8)
    }

    private var fileUploadCard: some View {
        Button {
            showingImporter = true
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                PKDSectionLabel(text: "File (PDF or Image)")

                VStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(Color(hex: "#F8FAFF"))
                            .frame(height: 148)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(style: StrokeStyle(lineWidth: 1.5, dash: [7, 5]))
                                    .foregroundStyle(PKDPalette.primary.opacity(0.22))
                            )

                        VStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(PKDPalette.primary.opacity(0.12))
                                .frame(width: 54, height: 54)
                                .overlay {
                                    Image(systemName: selectedFileURL == nil ? "square.and.arrow.up" : "checkmark.doc.fill")
                                        .font(.system(size: 22, weight: .bold))
                                        .foregroundStyle(PKDPalette.primary)
                                }

                            Text(selectedFileURL?.lastPathComponent ?? "Choose report, scan, or image")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)

                            Text(selectedFileURL == nil ? "Tap to browse files and photos" : "Tap to replace selected file")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                        }
                        .padding(.horizontal, 20)
                    }

                    HStack(spacing: 8) {
                        PKDStatusCapsule(text: "Vault Ready", color: PKDPalette.primary)
                        Text("PDF, PNG, JPG, HEIC")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Color.white.opacity(0.96))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 14, x: 0, y: 8)
        }
        .buttonStyle(.plain)
    }

    private func disclosureCard(title: String, icon: String, tint: Color, body: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(tint.opacity(0.12))
                .frame(width: 42, height: 42)
                .overlay {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(tint)
                }

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Text(body)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.96))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(tint.opacity(0.12), lineWidth: 1)
        )
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: label)
            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Category")
            Picker("Category", selection: $viewModel.category) {
                ForEach(viewModel.categories, id: \.self) { c in
                    Text(c)
                }
            }
            .pickerStyle(.menu)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var documentDateField: some View {
        VStack(alignment: .leading, spacing: 6) {
            PKDSectionLabel(text: "Document Date")
            HStack {
                Text(viewModel.documentDate.formatted(.dateTime.month(.twoDigits).day(.twoDigits).year()))
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
                Spacer()
                Image(systemName: "calendar")
                    .foregroundStyle(PKDPalette.textMuted)
            }
            .padding(12)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                DatePicker("", selection: $viewModel.documentDate, displayedComponents: .date)
                    .labelsHidden()
                    .datePickerStyle(.compact)
                    .opacity(0.02)
            )
        }
    }

    private var filteredDocs: [DocumentRecord] {
        if activeFilter == "All" {
            return viewModel.documents
        }
        return viewModel.documents.filter { $0.category == activeFilter }
    }
}

private struct DocumentDetailSheet: View {
    let document: DocumentRecord
    let initialDetail: RemoteDocumentDetailDTO?
    let onClose: () -> Void
    let onDelete: () -> Void

    @Environment(\.openURL) private var openURL
    @State private var remoteDetail: RemoteDocumentDetailDTO?
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var titleText: String { remoteDetail?.title ?? document.title }
    private var categoryText: String { remoteDetail?.category ?? document.category }
    private var mimeType: String { remoteDetail?.mimeType ?? document.mimeType }
    private var summaryText: String? { remoteDetail?.aiSummary ?? document.aiSummary }
    private var feedbackText: String? { remoteDetail?.aiFeedback ?? document.aiFeedback }
    private var displayDate: Date { remoteDetail?.createdAt ?? document.createdAt }
    private var viewUrl: URL? { URL(string: remoteDetail?.viewUrl ?? "") }
    private var isImage: Bool { mimeType.hasPrefix("image/") }

    init(
        document: DocumentRecord,
        initialDetail: RemoteDocumentDetailDTO?,
        onClose: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.document = document
        self.initialDetail = initialDetail
        self.onClose = onClose
        self.onDelete = onDelete
        _remoteDetail = State(initialValue: initialDetail)
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    previewCard

                    HStack(spacing: 12) {
                        metricCard(title: "Category", value: categoryText)
                        metricCard(
                            title: "Date",
                            value: displayDate.formatted(.dateTime.month(.abbreviated).day().year())
                        )
                    }

                    if isLoading {
                        ProgressView("Loading document...")
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 12)
                    }

                    if let summary = summaryText, !summary.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Automated Summary")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.primary)
                            Text(summary)
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(PKDPalette.textMain)
                                .multilineTextAlignment(.leading)
                            if let feedback = feedbackText, !feedback.isEmpty {
                                Divider()
                                Text(feedback)
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(PKDPalette.textMuted)
                            }
                        }
                        .pkdCard()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Stored Document")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.primary)
                        Text("This file is stored in your vault for secure retrieval and recordkeeping. It is transmitted from your device to backend services for storage and sync. Automated summaries, where enabled, are optional, consumer-facing, and informational only.")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(PKDPalette.textMain)
                    }
                    .pkdCard()

                    if let errorMessage, !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(PKDPalette.warning)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(PKDPalette.warning.opacity(0.08), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }

                    Button(role: .destructive, action: onDelete) {
                        HStack {
                            Image(systemName: "trash")
                            Text("Delete")
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(PKDOutlineButtonStyle())
                }
                .padding()
            }
            .pkdPageBackground()
            .navigationTitle(titleText)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .foregroundStyle(PKDPalette.textMuted)
                            .frame(width: 34, height: 34)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                            )
                    }
                }
            }
            .task {
                await loadDetail()
            }
        }
    }

    private var previewCard: some View {
        VStack(spacing: 14) {
            if isImage, let viewUrl {
                AsyncImage(url: viewUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 260)
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    case .failure:
                        filePlaceholder
                    default:
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 220)
                    }
                }
            } else {
                filePlaceholder
            }

            if let viewUrl {
                Button {
                    openURL(viewUrl)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: mimeType == "application/pdf" ? "doc.richtext" : "arrow.up.forward.app")
                        Text(mimeType == "application/pdf" ? "Open PDF" : "Open Document")
                    }
                    .frame(maxWidth: .infinity, minHeight: 46)
                }
                .buttonStyle(PKDPrimaryButtonStyle())
            }
        }
    }

    private var filePlaceholder: some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(Color(hex: "#EEF3FF"))
            .frame(maxWidth: .infinity, minHeight: 260)
            .overlay {
                VStack(spacing: 10) {
                    Image(systemName: mimeType == "application/pdf" ? "doc.richtext" : "photo")
                        .font(.system(size: 30))
                        .foregroundStyle(PKDPalette.primary.opacity(0.7))
                    Text(mimeType == "application/pdf" ? "PDF Document" : "Stored Image")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
            }
    }

    private func metricCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1)
                .foregroundStyle(PKDPalette.textMuted)
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.08), lineWidth: 1)
        )
    }

    private func loadDetail() async {
        isLoading = true
        defer { isLoading = false }
        do {
            remoteDetail = try await MobileDocumentsService.fetchDetail(id: document.id)
            errorMessage = nil
        } catch {
            if remoteDetail?.viewUrl == nil {
                errorMessage = "Could not refresh this document. Showing the locally saved copy."
            } else {
                errorMessage = nil
            }
        }
    }
}
