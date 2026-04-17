import SwiftUI
import UIKit

struct ResourcesView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    enum Mode: String, CaseIterable, Identifiable {
        case globalDirectory = "GLOBAL DIRECTORY"
        case knowledgeLibrary = "KNOWLEDGE LIBRARY"
        var id: String { rawValue }
    }

    @StateObject private var viewModel = ResourcesViewModel()
    @State private var backendURL = AppConfig.defaultBackendURL
    @State private var showFilters = false
    @State private var mode: Mode = .globalDirectory

    @State private var focusArea: String = "ALL TYPES"
    @State private var region: String = "GLOBAL"
    @State private var country: String = "ALL"
    @State private var stateRegion: String = "ALL"
    @State private var city: String = "ALL"
    @State private var expandedRegions: Set<String> = []
    @State private var expandedCountries: Set<String> = []
    @State private var expandedStates: Set<String> = []
    @State private var expandedNodes: Set<String> = []

    private let focusAreas = ["ALL TYPES", "SUPPORT GROUPS", "ADVOCACY", "HOSPITALS"]
    private let regionOrder = ["GLOBAL", "AFRICA", "ASIA", "EUROPE", "NORTH AMERICA", "SOUTH AMERICA", "OCEANIA"]
    private var isCompact: Bool { horizontalSizeClass == .compact }
    private var filterRailWidth: CGFloat { isCompact ? 148 : 210 }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 16) {
                        topTabs
                        heroBlock
                        searchBar

                        if mode == .globalDirectory {
                            directoryContent
                        } else {
                            knowledgeContent
                        }
                    }
                    .padding()
                    .padding(.bottom, 24)
                }
            }
            .pkdPageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showFilters) {
                filterSheet
            }
            .onAppear {
                backendURL = AppConfig.defaultBackendURL
                Task { await viewModel.fetchDirectory(city: nil) }
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("KIDNEY OS")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .italic()
                    .foregroundStyle(PKDPalette.textMain)
                Text("Global directory + knowledge library")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }
            Spacer()
            Button {
                showFilters = true
            } label: {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(PKDPalette.primary.opacity(0.12))
                    .frame(width: 36, height: 36)
                    .overlay {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                            .foregroundStyle(PKDPalette.primary)
                    }
            }
            .buttonStyle(.plain)
        }
        .pkdGlassHeader()
    }

    private var topTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Mode.allCases) { item in
                    Button {
                        mode = item
                    } label: {
                        Text(item.rawValue)
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .foregroundStyle(mode == item ? .white : PKDPalette.textMuted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                            .fixedSize(horizontal: true, vertical: false)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(
                                Capsule()
                                    .fill(mode == item ? PKDPalette.primary : Color.white)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(PKDPalette.primary.opacity(0.15), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var heroBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle().fill(Color(hex: "#10B981")).frame(width: 6, height: 6)
                Text("LIVE GLOBAL SYNC: \(max(viewModel.locationOptions.cities.count * 2, viewModel.directoryEntries.count)) NODES")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "#10B981"))
            }
            Text(mode == .globalDirectory ? "KIDNEY OS" : "CENTRAL INTELLIGENCE")
                .font(.system(size: isCompact ? 22 : 26, weight: .black, design: .rounded))
                .italic()
                .foregroundStyle(PKDPalette.textMain)
            Text(mode == .globalDirectory ? "Exploration mode: \(locationBreadcrumb)" : "Global repository of filtered medical protocols and research summaries.")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private var directoryContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 12)
            }
            if let message = viewModel.errorMessage, !message.isEmpty {
                Text(message)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }
            worldRegionBrowser
            let nodes = directoryNodes
            if nodes.isEmpty && !viewModel.isLoading {
                ForEach(sampleDirectory, id: \.id) { node in
                    directoryCard(node)
                }
            } else {
                ForEach(nodes) { node in
                    directoryCard(node)
                }
            }
        }
    }

    private var worldRegionBrowser: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("WORLD REGIONS")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1.4)
                    .foregroundStyle(PKDPalette.textMuted)
                Spacer()
                Text("\(max(viewModel.locationOptions.cities.count * 2, viewModel.directoryEntries.count)) resources")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
            }

            VStack(spacing: 6) {
                ForEach(availableRegions, id: \.self) { item in
                    regionSection(item)
                }
            }
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private var directoryNodes: [DirectoryNode] {
        if !viewModel.directoryEntries.isEmpty {
            return viewModel.directoryEntries.map { DirectoryNode.from($0) }
        }
        if !viewModel.providers.isEmpty {
            return viewModel.providers.map { DirectoryNode.from($0) }
        }
        return []
    }

    private var knowledgeContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("IMMEDIATE TACTICAL")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(Color(hex: "#EF4444"))
                Spacer()
            }
            emergencyCard
            ForEach(sampleKnowledge, id: \.id) { item in
                knowledgeCard(item)
            }
        }
    }

    private var emergencyCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(hex: "#EF4444"))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Text("*")
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                    }
                VStack(alignment: .leading, spacing: 2) {
                    Text("PROTOCOL ZERO")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                    Text("IMMEDIATE MEDICAL ASSET")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                Spacer()
            }

            VStack(spacing: 8) {
                emergencyRow(title: "PKD FOUNDATION HOPE", subtitle: "USA SUPPORT")
                emergencyRow(title: "NATIONAL 988 LIFELINE", subtitle: "GLOBAL CRISIS")
            }

            Text("IF LIFE IS IN IMMEDIATE DANGER, DIAL 911/999/112")
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(10)
                .background(Color(hex: "#FEF2F2"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color(hex: "#EF4444"), lineWidth: 2)
        )
    }

    private func emergencyRow(title: String, subtitle: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(subtitle)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "#EF4444"))
                Text(title)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.textMain)
            }
            Spacer()
            Image(systemName: "phone.fill")
                .foregroundStyle(Color(hex: "#EF4444"))
        }
        .padding(10)
        .background(Color(hex: "#F8FAFF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func directoryCard(_ node: DirectoryNode) -> some View {
        let isExpanded = expandedNodes.contains(node.id)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        tagChip(node.category)
                        if let focus = node.focusArea {
                            tagChip(focus)
                        }
                    }
                    Text(node.name)
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .italic()
                        .foregroundStyle(PKDPalette.textMain)
                        .lineLimit(isCompact ? 1 : 2)
                        .minimumScaleFactor(0.75)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if isCompact {
                        VStack(alignment: .leading, spacing: 4) {
                            compactMetaRow(text: node.region, icon: "globe")
                            compactMetaRow(text: node.country, icon: "flag")
                            compactMetaRow(text: node.city, icon: "mappin.and.ellipse")
                        }
                    } else {
                        HStack(spacing: 8) {
                            Label(node.region, systemImage: "globe")
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                            Label(node.country, systemImage: "flag")
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                            Label(node.city, systemImage: "mappin.and.ellipse")
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                        }
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(PKDPalette.primary)
                        .minimumScaleFactor(0.7)
                    }
                }
                Spacer()
                Button {
                    toggleNode(node.id)
                } label: {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white)
                        .frame(width: 36, height: 36)
                        .overlay {
                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .foregroundStyle(PKDPalette.primary)
                                .font(.system(size: 14, weight: .bold))
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }

            if isCompact {
                compactNodeAccessCard(node)
            } else {
                HStack {
                    Spacer()
                    nodeAccessCard(node, width: 102, compact: false)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("MISSION OVERVIEW")
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundStyle(PKDPalette.primary)
                Text(node.summary)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
            }

            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    if let services = node.services, !services.isEmpty {
                        infoRow("Services", services)
                    }
                    if let phone = node.phone, !phone.isEmpty {
                        infoRow("Phone", phone)
                    }
                    if let website = node.website, !website.isEmpty {
                        Button {
                            openPortal(website)
                        } label: {
                            HStack {
                                Text("Open Website")
                                    .font(.system(size: 12, weight: .bold, design: .rounded))
                                Spacer()
                                Image(systemName: "arrow.up.right.square")
                            }
                            .foregroundStyle(PKDPalette.primary)
                            .padding(12)
                            .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture {
            toggleNode(node.id)
        }
    }

    private func compactNodeAccessCard(_ node: DirectoryNode) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("NODE ACCESS")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            Button {
                guard let website = node.website else { return }
                openPortal(website)
            } label: {
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(hex: "#EEF2FF"))
                        .frame(width: 30, height: 30)
                        .overlay {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(PKDPalette.primary)
                        }
                    Text("PORTAL")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundStyle(PKDPalette.primary)
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(PKDPalette.primary)
                    Spacer()
                    Text(node.costTag)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(node.costTag == "FREE" ? PKDPalette.success : PKDPalette.primary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            (node.costTag == "FREE" ? PKDPalette.success.opacity(0.12) : PKDPalette.primary.opacity(0.12)),
                            in: Capsule()
                        )
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(hex: "#EEF2FF"), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(12)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private func compactMetaRow(text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(PKDPalette.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
    }

    private func nodeAccessCard(_ node: DirectoryNode, width: CGFloat?, compact: Bool) -> some View {
        Button {
            guard let website = node.website else { return }
            openPortal(website)
        } label: {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white)
                .frame(width: width, height: compact ? nil : 102)
                .overlay(
                    VStack(spacing: compact ? 8 : 6) {
                        Text("NODE ACCESS")
                            .font(.system(size: 8, weight: .bold, design: .rounded))
                            .foregroundStyle(PKDPalette.textMuted)
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color(hex: "#EEF2FF"))
                            .frame(width: compact ? nil : 70, height: 34)
                            .overlay {
                                HStack(spacing: 4) {
                                    Image(systemName: "paperplane.fill")
                                    Text("PORTAL")
                                    Image(systemName: "arrow.up.right")
                                        .font(.system(size: 9, weight: .bold))
                                }
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.primary)
                            }
                        HStack(spacing: 4) {
                            Text("SERVICE COST")
                                .font(.system(size: 7, weight: .bold, design: .rounded))
                                .foregroundStyle(PKDPalette.textMuted)
                            Text(node.costTag)
                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                .foregroundStyle(node.costTag == "FREE" ? PKDPalette.success : PKDPalette.primary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(node.costTag == "FREE" ? PKDPalette.success.opacity(0.12) : PKDPalette.primary.opacity(0.12), in: Capsule())
                        }
                    }
                    .padding(compact ? 10 : 8)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private func knowledgeCard(_ item: KnowledgeItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(item.section.uppercased())
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.primary)
            Text(item.title)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(PKDPalette.textMain)
            Text(item.summary)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            Button {
            } label: {
                HStack(spacing: 6) {
                    Text("OPEN INTEL")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                    Image(systemName: "paperplane.fill")
                }
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
        .padding(14)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private func tagChip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .bold, design: .rounded))
            .foregroundStyle(PKDPalette.primary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: "#EEF2FF"), in: Capsule())
    }

    private var filterSheet: some View {
        NavigationStack {
            Group {
                if isCompact {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 16) {
                            leftFilterRail
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Button {
                                AppConfig.setBackendURL(backendURL)
                                Task {
                                    await viewModel.fetchDirectory(category: focusArea, continent: region == "GLOBAL" ? nil : region, country: country == "ALL" ? nil : country, state: stateRegion == "ALL" ? nil : stateRegion, city: city == "ALL" ? nil : city, search: effectiveDirectorySearch)
                                }
                                showFilters = false
                            } label: {
                                HStack {
                                    Image(systemName: "magnifyingglass")
                                    Text("Search Directory")
                                }
                            }
                            .buttonStyle(PKDPrimaryButtonStyle())
                        }
                        .padding()
                    }
                } else {
                    HStack(spacing: 0) {
                        leftFilterRail

                        ScrollView(showsIndicators: false) {
                            VStack(alignment: .leading, spacing: 16) {
                                HStack(spacing: 8) {
                                    Button {
                                        mode = .globalDirectory
                                    } label: {
                                        Text("GLOBAL DIRECTORY")
                                            .font(.system(size: 10, weight: .black, design: .rounded))
                                            .foregroundStyle(mode == .globalDirectory ? .white : PKDPalette.textMuted)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(mode == .globalDirectory ? PKDPalette.primary : Color.white, in: Capsule())
                                            .overlay(
                                                Capsule()
                                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                                            )
                                    }
                                    .buttonStyle(.plain)

                                    Button {
                                        mode = .knowledgeLibrary
                                    } label: {
                                        Text("KNOWLEDGE LIBRARY")
                                            .font(.system(size: 10, weight: .bold, design: .rounded))
                                            .foregroundStyle(mode == .knowledgeLibrary ? .white : PKDPalette.textMuted)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(mode == .knowledgeLibrary ? PKDPalette.primary : Color.white, in: Capsule())
                                            .overlay(
                                                Capsule()
                                                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
                                            )
                                    }
                                    .buttonStyle(.plain)
                                    Spacer()
                                }

                                Text(mode == .globalDirectory ? "KIDNEY OS" : "CENTRAL INTELLIGENCE")
                                    .font(.system(size: 22, weight: .black, design: .rounded))
                                    .italic()
                                    .foregroundStyle(PKDPalette.textMain)

                                Button {
                                AppConfig.setBackendURL(backendURL)
                                Task {
                                    await viewModel.fetchDirectory(category: focusArea, continent: region == "GLOBAL" ? nil : region, country: country == "ALL" ? nil : country, state: stateRegion == "ALL" ? nil : stateRegion, city: city == "ALL" ? nil : city, search: effectiveDirectorySearch)
                                }
                                showFilters = false
                            } label: {
                                    HStack {
                                        Image(systemName: "magnifyingglass")
                                        Text("Search Directory")
                                    }
                                }
                                .buttonStyle(PKDPrimaryButtonStyle())
                            }
                            .padding()
                        }
                    }
                }
            }
            .pkdPageBackground()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showFilters = false
                    } label: {
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
                ToolbarItem(placement: .topBarLeading) {
                    Button("Reset") {
                        focusArea = "ALL TYPES"
                        region = "GLOBAL"
                        country = "ALL"
                        stateRegion = "ALL"
                        viewModel.location = ""
                        city = "ALL"
                        Task { await viewModel.fetchDirectory(city: nil) }
                    }
                }
            }
        }
    }

    private var searchBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            PKDSectionLabel(text: "Search Kidney Terms")
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(PKDPalette.textMuted)
                TextField("E.g. Hospital, Mayo, UK...", text: $viewModel.location)
                    .textFieldStyle(.plain)
            }
            .padding(12)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )
            Button {
                Task {
                    await viewModel.fetchDirectory(category: focusArea, continent: region == "GLOBAL" ? nil : region, country: country == "ALL" ? nil : country, state: stateRegion == "ALL" ? nil : stateRegion, city: city == "ALL" ? nil : city, search: effectiveDirectorySearch)
                }
            } label: {
                HStack {
                    Image(systemName: "magnifyingglass")
                    Text("Search Directory")
                }
            }
            .buttonStyle(PKDPrimaryButtonStyle())
        }
    }

    private var leftFilterRail: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("GLOBAL FILTER")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                Spacer()
                Button("RESET") {
                    focusArea = "ALL TYPES"
                    region = "GLOBAL"
                    country = "ALL"
                    stateRegion = "ALL"
                    viewModel.location = ""
                    city = "ALL"
                    Task { await viewModel.fetchDirectory(city: nil) }
                }
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
            }

            PKDSectionLabel(text: "Search Kidney Terms")
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(PKDPalette.textMuted)
                TextField("E.g. Hospital, Mayo, UK...", text: $viewModel.location)
                    .textFieldStyle(.plain)
            }
            .padding(10)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(PKDPalette.primary.opacity(0.12), lineWidth: 1)
            )

            PKDSectionLabel(text: "Focus Area")
            VStack(spacing: 6) {
                ForEach(focusAreas, id: \.self) { item in
                    Button {
                        focusArea = item
                        Task {
                            await viewModel.fetchDirectory(category: focusArea, continent: region == "GLOBAL" ? nil : region, country: country == "ALL" ? nil : country, state: stateRegion == "ALL" ? nil : stateRegion, city: city == "ALL" ? nil : city, search: effectiveDirectorySearch)
                        }
                    } label: {
                        HStack {
                            Text(item)
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(focusArea == item ? .white : PKDPalette.textMain)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Spacer()
                        }
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(focusArea == item ? PKDPalette.primary : Color(hex: "#F8FAFF"))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            PKDSectionLabel(text: "World Regions")
            VStack(spacing: 6) {
                ForEach(availableRegions, id: \.self) { item in
                    regionSection(item)
                }
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: isCompact ? .infinity : filterRailWidth)
        .padding()
        .background(Color.white)
        .overlay(
            Rectangle()
                .fill(PKDPalette.primary.opacity(0.08))
                .frame(width: isCompact ? 0 : 1),
            alignment: .trailing
        )
    }

    private var availableRegions: [String] {
        let apiRegions = viewModel.locationOptions.regions.map { $0.uppercased() }
        let hierarchyRegions = Array((viewModel.directoryHierarchy?.data ?? [:]).keys).map { $0.uppercased() }
        let merged = Set(regionOrder + apiRegions + hierarchyRegions)
        let ordered = regionOrder.filter { merged.contains($0) }
        let extras = Array(merged.subtracting(regionOrder)).sorted()
        return ordered + extras
    }

    private func countriesForRegion(_ regionName: String) -> [String] {
        if regionName == "GLOBAL" {
            return viewModel.locationOptions.countries
        }

        let hierarchyMatches = viewModel.directoryHierarchy?.data.first(where: { $0.key.uppercased() == regionName.uppercased() })?.value.keys.map { $0 }.sorted() ?? []
        if !hierarchyMatches.isEmpty {
            return hierarchyMatches
        }

        if self.region.uppercased() == regionName.uppercased() {
            return viewModel.locationOptions.countries
        }

        return []
    }

    private func statesForRegion(_ regionName: String, _ countryName: String) -> [String] {
        let states = viewModel.directoryHierarchy?.data
            .first(where: { $0.key.uppercased() == regionName.uppercased() })?
            .value
            .first(where: { $0.key.uppercased() == countryName.uppercased() })?
            .value ?? []
        if !states.isEmpty {
            return states.sorted()
        }

        if self.region.uppercased() == regionName.uppercased(), self.country.uppercased() == countryName.uppercased() {
            return viewModel.locationOptions.states
        }

        return []
    }

    private func citiesForRegion(_ regionName: String, _ countryName: String, _ stateName: String? = nil) -> [String] {
        guard self.region.uppercased() == regionName.uppercased(),
              self.country.uppercased() == countryName.uppercased()
        else {
            return []
        }

        if let stateName, stateName.uppercased() != "ALL", self.stateRegion.uppercased() != stateName.uppercased() {
            return []
        }

        return viewModel.locationOptions.cities.sorted()
    }

    private func regionSection(_ item: String) -> some View {
        let isExpanded = expandedRegions.contains(item)
        return VStack(alignment: .leading, spacing: 6) {
            Button {
                let newExpanded = !isExpanded
                withAnimation(.easeInOut(duration: 0.18)) {
                    region = item
                    country = "ALL"
                    stateRegion = "ALL"
                    city = "ALL"
                    viewModel.location = ""
                    expandedRegions = newExpanded ? [item] : []
                    expandedCountries.removeAll()
                    expandedStates.removeAll()
                }
                Task {
                    await viewModel.fetchDirectory(
                        category: focusArea,
                        continent: item == "GLOBAL" ? nil : item,
                        country: nil,
                        state: nil,
                        city: nil,
                        search: nil
                    )
                }
            } label: {
                HStack {
                    Text(item)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(region == item ? PKDPalette.primary : PKDPalette.textMain)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(region == item ? PKDPalette.primary.opacity(0.12) : Color(hex: "#F8FAFF"))
                )
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(countriesForRegion(item), id: \.self) { countryName in
                        countrySection(regionName: item, countryName: countryName)
                    }
                }
                .padding(.leading, 10)
            }
        }
    }

    private func countrySection(regionName: String, countryName: String) -> some View {
        let key = "\(regionName)|\(countryName)"
        let isExpanded = expandedCountries.contains(key)
        let states = statesForRegion(regionName, countryName)
        let cities = citiesForRegion(regionName, countryName)

        return VStack(alignment: .leading, spacing: 4) {
            Button {
                let newExpanded = !isExpanded
                withAnimation(.easeInOut(duration: 0.18)) {
                    region = regionName
                    country = countryName
                    stateRegion = "ALL"
                    city = "ALL"
                    viewModel.location = ""
                    expandedCountries = newExpanded ? [key] : []
                    expandedStates.removeAll()
                }
                Task {
                    await viewModel.fetchDirectory(
                        category: focusArea,
                        continent: regionName == "GLOBAL" ? nil : regionName,
                        country: countryName,
                        state: nil,
                        city: nil,
                        search: nil
                    )
                }
            } label: {
                HStack {
                    Text(countryName)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(country == countryName ? PKDPalette.primary : PKDPalette.textMain)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(PKDPalette.textMuted)
                }
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)

            if isExpanded {
                if !states.isEmpty {
                    ForEach(states, id: \.self) { stateName in
                        stateSection(regionName: regionName, countryName: countryName, stateName: stateName)
                    }
                } else if country == countryName {
                    ForEach(cities, id: \.self) { cityName in
                        cityButton(regionName: regionName, countryName: countryName, stateName: nil, cityName: cityName)
                    }
                }
            }
        }
    }

    private func stateSection(regionName: String, countryName: String, stateName: String) -> some View {
        let key = "\(regionName)|\(countryName)|\(stateName)"
        let isExpanded = expandedStates.contains(key)
        let cities = citiesForRegion(regionName, countryName, stateName)

        return VStack(alignment: .leading, spacing: 4) {
            Button {
                let newExpanded = !isExpanded
                withAnimation(.easeInOut(duration: 0.18)) {
                    region = regionName
                    country = countryName
                    stateRegion = stateName
                    city = "ALL"
                    viewModel.location = ""
                    expandedStates = newExpanded ? [key] : []
                }
                Task {
                    await viewModel.fetchDirectory(
                        category: focusArea,
                        continent: regionName == "GLOBAL" ? nil : regionName,
                        country: countryName,
                        state: stateName,
                        city: nil,
                        search: nil
                    )
                }
            } label: {
                HStack {
                    Text(stateName)
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(stateRegion == stateName ? PKDPalette.primary : PKDPalette.textMuted)
                    Spacer()
                    if !cities.isEmpty {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(PKDPalette.textMuted)
                    }
                }
                .padding(.leading, 12)
                .padding(.vertical, 3)
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(cities, id: \.self) { cityName in
                    cityButton(regionName: regionName, countryName: countryName, stateName: stateName, cityName: cityName)
                }
            }
        }
    }

    private func cityButton(regionName: String, countryName: String, stateName: String?, cityName: String) -> some View {
            Button {
                withAnimation(.easeInOut(duration: 0.18)) {
                    region = regionName
                    country = countryName
                    stateRegion = stateName ?? "ALL"
                    city = cityName
                    viewModel.location = ""
                }
                Task {
                    await viewModel.fetchDirectory(
                        category: focusArea,
                        continent: regionName == "GLOBAL" ? nil : regionName,
                        country: countryName,
                        state: stateName,
                        city: cityName,
                        search: nil
                    )
                }
            } label: {
            HStack {
                Text(cityName)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(PKDPalette.textMuted)
                Spacer()
            }
            .padding(.leading, 24)
            .padding(.vertical, 2)
        }
        .buttonStyle(.plain)
    }

    private func toggleNode(_ id: String) {
        if expandedNodes.contains(id) {
            expandedNodes.remove(id)
        } else {
            expandedNodes.insert(id)
        }
    }

    private func openPortal(_ website: String) {
        guard let url = normalizedURL(website) else { return }
        openURL(url)
    }

    private func normalizedURL(_ raw: String) -> URL? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if let direct = URL(string: trimmed), direct.scheme != nil {
            return direct
        }

        if let prefixed = URL(string: "https://\(trimmed)") {
            return prefixed
        }

        let query = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
        return URL(string: "https://www.google.com/search?q=\(query)")
    }

    private func infoRow(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(PKDPalette.primary)
            Text(value)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(PKDPalette.textMuted)
        }
    }

    private var effectiveDirectorySearch: String? {
        let manual = viewModel.location.trimmingCharacters(in: .whitespacesAndNewlines)
        if !manual.isEmpty { return manual }
        if city != "ALL" { return city }
        return nil
    }

    private var locationBreadcrumb: String {
        let tail = city == "ALL" ? stateRegion : city
        return "\(region) / \(country) / \(tail)"
    }
}

private struct DirectoryNode: Identifiable {
    let id: String
    let name: String
    let category: String
    let focusArea: String?
    let region: String
    let country: String
    let city: String
    let summary: String
    let costTag: String
    let website: String?
    let phone: String?
    let services: String?

    static func from(_ provider: ProviderDTO) -> DirectoryNode {
        DirectoryNode(
            id: provider.id,
            name: provider.name,
            category: provider.specialty == "DIALYSIS_CENTER" ? "HOSPITALS & RENAL CENTERS" : "ACADEMIC",
            focusArea: provider.specialty == "DIALYSIS_CENTER" ? "HOSPITALS" : "SUPPORT GROUPS",
            region: "GLOBAL",
            country: provider.address.split(separator: ",").dropLast().last.map(String.init) ?? "USA",
            city: provider.address.split(separator: ",").first.map(String.init) ?? "",
            summary: provider.address,
            costTag: "FREE",
            website: provider.website,
            phone: provider.phone,
            services: provider.specialty
        )
    }

    static func from(_ entry: ResourceEntryDTO) -> DirectoryNode {
        DirectoryNode(
            id: entry.id,
            name: entry.name,
            category: entry.category?.label ?? entry.category?.name ?? "SUPPORT GROUPS",
            focusArea: entry.category?.label ?? entry.category?.name,
            region: (entry.continent ?? "GLOBAL").uppercased(),
            country: (entry.country).uppercased(),
            city: ((entry.city ?? entry.state) ?? "").uppercased(),
            summary: entry.summary,
            costTag: (entry.cost ?? "FREE").uppercased(),
            website: entry.website,
            phone: entry.phone,
            services: entry.services
        )
    }
}

private struct KnowledgeItem: Identifiable {
    let id = UUID()
    let section: String
    let title: String
    let summary: String
}

private let sampleDirectory: [DirectoryNode] = [
    DirectoryNode(
        id: "sample-aipd",
        name: "AIPD ONLUS ITALIA",
        category: "ITALY HUB",
        focusArea: "SUPPORT GROUPS",
        region: "EUROPE",
        country: "ITALY",
        city: "ROME",
        summary: "Italian association for the fight against polycystic kidney disease.",
        costTag: "FREE",
        website: "https://www.aipd.it",
        phone: nil,
        services: "Support groups, education, advocacy"
    ),
    DirectoryNode(
        id: "sample-yale",
        name: "YALE NEW HAVEN HOSPITAL",
        category: "ACADEMIC",
        focusArea: "HOSPITALS & RENAL CENTERS",
        region: "NORTH AMERICA",
        country: "USA",
        city: "NEW HAVEN, CT",
        summary: "Elite academic center for renal genetics and transplant in Connecticut.",
        costTag: "INSURANCE",
        website: "https://www.ynhh.org",
        phone: nil,
        services: "Nephrology, genetics, transplant"
    )
]

private let sampleKnowledge: [KnowledgeItem] = [
    KnowledgeItem(
        section: "Tactical",
        title: "Dialysis Explained: Hemo vs. Peritoneal",
        summary: "A comparison of the two main dialysis methods to help you choose the best fit for your lifestyle."
    ),
    KnowledgeItem(
        section: "Hospitals",
        title: "Navigating ARPKD as a New Parent",
        summary: "Emotional support and a medical checklist for families managing an infant diagnosis."
    ),
    KnowledgeItem(
        section: "Research",
        title: "Gene Therapy: The Future of PKD?",
        summary: "Exploring current clinical trials aiming to correct genetic defects at the cellular level."
    )
]
