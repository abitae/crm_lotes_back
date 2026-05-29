<?php

namespace Tests\Feature\Inmopro;

use App\Http\Requests\Inmopro\StoreProjectRequest;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProjectDocumentUploadValidationTest extends TestCase
{
    public function test_document_upload_requires_title_for_each_file(): void
    {
        $file = UploadedFile::fake()->create('brochure.pdf', 100, 'application/pdf');
        $base = Request::create('/inmopro/projects', 'POST', [
            'name' => 'Proyecto demo',
            'document_titles' => [''],
        ], [], [
            'document_files' => [$file],
        ]);

        $form = StoreProjectRequest::createFrom($base);
        $form->setContainer(app());
        $form->setRedirector(app('redirect'));

        $this->expectException(ValidationException::class);

        $form->validateResolved();
    }

    public function test_document_upload_accepts_matching_titles_and_files(): void
    {
        $file = UploadedFile::fake()->create('archivo.pdf', 100, 'application/pdf');
        $base = Request::create('/inmopro/projects', 'POST', [
            'name' => 'Proyecto demo',
            'document_titles' => ['Plano general'],
        ], [], [
            'document_files' => [$file],
        ]);

        $form = StoreProjectRequest::createFrom($base);
        $form->setContainer(app());
        $form->setRedirector(app('redirect'));

        $form->validateResolved();

        $this->assertSame(['Plano general'], $form->validated('document_titles'));
    }
}
