import ExpoModulesCore

public final class ICloudBackupStorageModule: Module {
  private let backupDirectoryName = "Personal Nutrition Tracker"
  private let backupFileName = "personal-nutrition-tracker-backup.json"

  public func definition() -> ModuleDefinition {
    Name("ICloudBackupStorage")

    AsyncFunction("isAvailable") { () -> Bool in
      return FileManager.default.url(forUbiquityContainerIdentifier: nil) != nil
    }

    AsyncFunction("writeBackup") { (contents: String) throws in
      let destination = try self.backupURL()
      let directory = destination.deletingLastPathComponent()
      try FileManager.default.createDirectory(
        at: directory,
        withIntermediateDirectories: true
      )

      guard let data = contents.data(using: .utf8) else {
        throw ICloudBackupError.encodingFailed
      }

      let coordinator = NSFileCoordinator(filePresenter: nil)
      var coordinationError: NSError?
      var writeError: Error?
      let options: NSFileCoordinator.WritingOptions = FileManager.default.fileExists(
        atPath: destination.path
      ) ? .forReplacing : []
      coordinator.coordinate(
        writingItemAt: destination,
        options: options,
        error: &coordinationError
      ) { coordinatedURL in
        do {
          try data.write(to: coordinatedURL, options: .atomic)
        } catch {
          writeError = error
        }
      }

      if let coordinationError {
        throw coordinationError
      }
      if let writeError {
        throw writeError
      }
    }

    AsyncFunction("readBackup") { () throws -> String? in
      let source = try self.backupURL()
      guard FileManager.default.fileExists(atPath: source.path) else {
        return nil
      }

      let coordinator = NSFileCoordinator(filePresenter: nil)
      var coordinationError: NSError?
      var readResult: Result<String, Error>?
      coordinator.coordinate(
        readingItemAt: source,
        options: [],
        error: &coordinationError
      ) { coordinatedURL in
        readResult = Result {
          try String(contentsOf: coordinatedURL, encoding: .utf8)
        }
      }

      if let coordinationError {
        throw coordinationError
      }
      return try readResult?.get()
    }
  }

  private func backupURL() throws -> URL {
    guard let container = FileManager.default.url(forUbiquityContainerIdentifier: nil) else {
      throw ICloudBackupError.containerUnavailable
    }
    return container
      .appendingPathComponent("Documents", isDirectory: true)
      .appendingPathComponent(backupDirectoryName, isDirectory: true)
      .appendingPathComponent(backupFileName, isDirectory: false)
  }
}

private enum ICloudBackupError: Error, LocalizedError {
  case containerUnavailable
  case encodingFailed

  var errorDescription: String? {
    switch self {
    case .containerUnavailable:
      return "The iCloud document container is unavailable."
    case .encodingFailed:
      return "The backup could not be encoded."
    }
  }
}
